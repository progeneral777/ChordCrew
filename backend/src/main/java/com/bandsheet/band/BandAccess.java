package com.bandsheet.band;

import com.bandsheet.common.exception.AppException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** 樂團層級授權檢查:非成員一律 404(不洩漏樂團存在),角色不足 403。 */
@Service
public class BandAccess {

    private final BandMemberRepository memberRepository;

    public BandAccess(BandMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public BandMember requireMember(UUID bandId, UUID userId) {
        return memberRepository.findByBandIdAndUserId(bandId, userId)
                .orElseThrow(() -> AppException.notFound("NOT_FOUND", "找不到樂團或你不是成員"));
    }

    public BandMember requireRole(UUID bandId, UUID userId, Role minimum) {
        BandMember member = requireMember(bandId, userId);
        if (!member.getRole().atLeast(minimum)) {
            throw AppException.forbidden(minimum == Role.OWNER
                    ? "只有樂團擁有者可以執行此操作"
                    : "需要編輯權限");
        }
        return member;
    }
}
