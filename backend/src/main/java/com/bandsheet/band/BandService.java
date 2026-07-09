package com.bandsheet.band;

import com.bandsheet.auth.User;
import com.bandsheet.auth.UserRepository;
import com.bandsheet.band.dto.BandDtos.BandDetail;
import com.bandsheet.band.dto.BandDtos.BandSummary;
import com.bandsheet.band.dto.BandDtos.InviteResult;
import com.bandsheet.band.dto.BandDtos.MemberDto;
import com.bandsheet.common.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BandService {

    private static final Duration INVITE_TTL = Duration.ofDays(7);

    private final BandRepository bandRepository;
    private final BandMemberRepository memberRepository;
    private final BandInviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public BandService(BandRepository bandRepository,
                       BandMemberRepository memberRepository,
                       BandInviteRepository inviteRepository,
                       UserRepository userRepository,
                       @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.bandRepository = bandRepository;
        this.memberRepository = memberRepository;
        this.inviteRepository = inviteRepository;
        this.userRepository = userRepository;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional(readOnly = true)
    public List<BandSummary> listMyBands(UUID userId) {
        List<BandMember> myMemberships = memberRepository.findByUserId(userId);
        if (myMemberships.isEmpty()) return List.of();

        List<UUID> bandIds = myMemberships.stream().map(BandMember::getBandId).toList();
        Map<UUID, Band> bands = bandRepository.findAllById(bandIds).stream()
                .collect(Collectors.toMap(Band::getId, Function.identity()));
        Map<UUID, Long> counts = memberRepository.findByBandIdIn(bandIds).stream()
                .collect(Collectors.groupingBy(BandMember::getBandId, Collectors.counting()));

        return myMemberships.stream()
                .filter(m -> bands.containsKey(m.getBandId()))
                .map(m -> new BandSummary(
                        m.getBandId(),
                        bands.get(m.getBandId()).getName(),
                        m.getRole(),
                        counts.getOrDefault(m.getBandId(), 0L).intValue()))
                .sorted(Comparator.comparing(BandSummary::name))
                .toList();
    }

    @Transactional
    public BandSummary create(UUID userId, String name) {
        Band band = bandRepository.save(new Band(name, userId));
        memberRepository.save(new BandMember(band.getId(), userId, Role.OWNER));
        return new BandSummary(band.getId(), band.getName(), Role.OWNER, 1);
    }

    @Transactional(readOnly = true)
    public BandDetail getDetail(UUID bandId, UUID userId) {
        BandMember me = requireMember(bandId, userId);
        Band band = bandRepository.findById(bandId)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到樂團"));

        List<BandMember> members = memberRepository.findByBandId(bandId);
        Map<UUID, User> users = userRepository.findAllById(
                        members.stream().map(BandMember::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<MemberDto> memberDtos = members.stream()
                .filter(m -> users.containsKey(m.getUserId()))
                .map(m -> {
                    User u = users.get(m.getUserId());
                    return new MemberDto(u.getId(), u.getEmail(), u.getDisplayName(), m.getRole());
                })
                .sorted(Comparator.comparing(MemberDto::displayName))
                .toList();

        return new BandDetail(band.getId(), band.getName(), band.getOwnerId(), me.getRole(), memberDtos);
    }

    @Transactional
    public BandSummary rename(UUID bandId, UUID userId, String name) {
        requireOwner(bandId, userId);
        Band band = bandRepository.findById(bandId)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到樂團"));
        band.setName(name);
        int count = memberRepository.findByBandId(bandId).size();
        return new BandSummary(band.getId(), band.getName(), Role.OWNER, count);
    }

    @Transactional
    public void delete(UUID bandId, UUID userId) {
        requireOwner(bandId, userId);
        bandRepository.deleteById(bandId);
    }

    @Transactional
    public InviteResult createInvite(UUID bandId, UUID userId, Role role) {
        requireOwner(bandId, userId);
        if (role == Role.OWNER) {
            throw AppException.badRequest("VALIDATION_ERROR", "邀請角色只能是 EDITOR 或 VIEWER");
        }
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);

        BandInvite invite = inviteRepository.save(
                new BandInvite(bandId, token, role, Instant.now().plus(INVITE_TTL), userId));
        return new InviteResult(frontendBaseUrl + "/invites/" + token, token, invite.getExpiresAt());
    }

    @Transactional
    public BandSummary acceptInvite(String token, UUID userId) {
        BandInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "邀請連結不存在"));
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            throw AppException.gone("INVITE_EXPIRED", "邀請連結已過期");
        }
        Band band = bandRepository.findById(invite.getBandId())
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到樂團"));

        Role myRole = memberRepository.findByBandIdAndUserId(band.getId(), userId)
                .map(BandMember::getRole)
                .orElseGet(() -> memberRepository
                        .save(new BandMember(band.getId(), userId, invite.getRole()))
                        .getRole());

        int count = memberRepository.findByBandId(band.getId()).size();
        return new BandSummary(band.getId(), band.getName(), myRole, count);
    }

    @Transactional
    public void removeMember(UUID bandId, UUID userId, UUID targetUserId) {
        requireOwner(bandId, userId);
        BandMember target = requireMember(bandId, targetUserId);
        if (target.getRole() == Role.OWNER) {
            throw AppException.badRequest("VALIDATION_ERROR", "無法移除樂團擁有者");
        }
        memberRepository.delete(target);
    }

    @Transactional
    public MemberDto changeRole(UUID bandId, UUID userId, UUID targetUserId, Role role) {
        requireOwner(bandId, userId);
        if (role == Role.OWNER) {
            throw AppException.badRequest("VALIDATION_ERROR", "無法將成員設為 OWNER");
        }
        BandMember target = requireMember(bandId, targetUserId);
        if (target.getRole() == Role.OWNER) {
            throw AppException.badRequest("VALIDATION_ERROR", "無法變更樂團擁有者的角色");
        }
        target.setRole(role);
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到使用者"));
        return new MemberDto(user.getId(), user.getEmail(), user.getDisplayName(), role);
    }

    private BandMember requireMember(UUID bandId, UUID userId) {
        return memberRepository.findByBandIdAndUserId(bandId, userId)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到樂團或你不是成員"));
    }

    private void requireOwner(UUID bandId, UUID userId) {
        if (requireMember(bandId, userId).getRole() != Role.OWNER) {
            throw AppException.forbidden("只有樂團擁有者可以執行此操作");
        }
    }
}
