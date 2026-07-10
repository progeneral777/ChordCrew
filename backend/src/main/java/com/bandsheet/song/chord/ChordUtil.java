package com.bandsheet.song.chord;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 和弦解析與移調 — CHORD_SPEC.md 的 Java 實作。
 * 前端 lib/chord/ 有對應的 TS 實作,兩邊必須通過同一組測試案例。
 */
public final class ChordUtil {

    private ChordUtil() {}

    private static final Map<String, Integer> NOTE_INDEX = Map.ofEntries(
            Map.entry("C", 0), Map.entry("C#", 1), Map.entry("Db", 1),
            Map.entry("D", 2), Map.entry("D#", 3), Map.entry("Eb", 3),
            Map.entry("E", 4), Map.entry("F", 5), Map.entry("F#", 6),
            Map.entry("Gb", 6), Map.entry("G", 7), Map.entry("G#", 8),
            Map.entry("Ab", 8), Map.entry("A", 9), Map.entry("A#", 10),
            Map.entry("Bb", 10), Map.entry("B", 11));

    private static final String[] SHARP_NOTES =
            {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
    private static final String[] FLAT_NOTES =
            {"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"};

    // 各半音的慣用調名
    private static final String[] MAJOR_KEYS =
            {"C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"};
    private static final String[] MINOR_KEYS =
            {"Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"};

    // Quality 與 Extension token,依長度遞減供貪婪比對
    private static final List<String> SUFFIX_TOKENS = List.of(
            "7sus4",
            "add9", "maj7", "sus2", "sus4",
            "6/9", "maj", "min", "dim", "aug", "b13", "#11",
            "m7", "b5", "#5", "b9", "#9", "11", "13",
            "m", "5", "6", "7", "9", "+", "°");

    private static final Pattern BASS_PATTERN = Pattern.compile("^(.+)/([A-G][#b]?)$");
    private static final Pattern ROOT_PATTERN = Pattern.compile("^[A-G][#b]?");
    private static final Pattern KEY_PATTERN = Pattern.compile("^([A-G])(#|b)?(m(?!aj))?$");
    private static final Pattern KEY_PREFIX_PATTERN = Pattern.compile("^([A-G])(#|b)?(m(?!aj))?");
    private static final Pattern METADATA_PATTERN = Pattern.compile("^\\{\\s*[\\w-]+\\s*:\\s*.*?\\s*\\}$");
    private static final Pattern KEY_META_PATTERN = Pattern.compile("\\{\\s*key\\s*:\\s*([^}]+?)\\s*\\}");
    private static final Pattern SECTION_PATTERN = Pattern.compile("^\\[([^\\[\\]]+)\\]$");
    private static final Pattern ANCHOR_PATTERN = Pattern.compile("\\[([^\\[\\]]+)\\]");
    private static final Pattern BAR_CHORD_PATTERN = Pattern.compile("[A-G][#b]?[^\\s|]*");

    /** 解析和弦;無法解析回 null,不 throw。 */
    public static Chord parse(String input) {
        if (input == null || input.isEmpty()) return null;
        String rest = input;
        String bass = null;

        Matcher bassMatcher = BASS_PATTERN.matcher(rest);
        if (bassMatcher.matches()) {
            rest = bassMatcher.group(1);
            bass = bassMatcher.group(2);
        }

        Matcher rootMatcher = ROOT_PATTERN.matcher(rest);
        if (!rootMatcher.find()) return null;
        String root = rootMatcher.group();
        String suffix = rest.substring(root.length());
        if (!isValidSuffix(suffix)) return null;

        return new Chord(root, suffix, bass);
    }

    private static boolean isValidSuffix(String suffix) {
        int i = 0;
        outer:
        while (i < suffix.length()) {
            for (String token : SUFFIX_TOKENS) {
                if (suffix.startsWith(token, i)) {
                    i += token.length();
                    continue outer;
                }
            }
            return false;
        }
        return true;
    }

    /**
     * ♭ 調:F/Bb/Eb/Ab/Db/Gb 及其關係小調;有寫升降記號的調直接看記號;C/Am 預設 ♯。
     */
    public static boolean isFlatKey(String key) {
        Matcher m = KEY_PREFIX_PATTERN.matcher(key.trim());
        if (!m.find()) return false;
        String accidental = m.group(2);
        boolean minor = m.group(3) != null;
        if ("b".equals(accidental)) return true;
        if ("#".equals(accidental)) return false;
        char letter = m.group(1).charAt(0);
        return minor ? "DGCF".indexOf(letter) >= 0 : letter == 'F';
    }

    public static String transposeNote(String note, int semitones, boolean useFlat) {
        Integer idx = NOTE_INDEX.get(note);
        if (idx == null) return null;
        String[] table = useFlat ? FLAT_NOTES : SHARP_NOTES;
        return table[Math.floorMod(idx + semitones, 12)];
    }

    /** 移調 n 半音;無法解析回 null。targetKey 決定 ♯/♭,null 時預設 ♯。 */
    public static String transposeChord(String chord, int semitones, String targetKey) {
        Chord parsed = parse(chord);
        if (parsed == null) return null;
        boolean useFlat = targetKey != null && isFlatKey(targetKey);
        String root = transposeNote(parsed.root(), semitones, useFlat);
        if (root == null) return null;
        String bass = parsed.bass() != null ? transposeNote(parsed.bass(), semitones, useFlat) : null;
        return root + parsed.suffix() + (bass != null ? "/" + bass : "");
    }

    /** 調名移調,回傳慣用寫法(例:G +1 → Ab、C +1 → Db)。 */
    public static String transposeKey(String key, int semitones) {
        Matcher m = KEY_PATTERN.matcher(key.trim());
        if (!m.matches()) return key;
        String accidental = m.group(2) != null ? m.group(2) : "";
        Integer idx = NOTE_INDEX.get(m.group(1) + accidental);
        if (idx == null) return key;
        int ni = Math.floorMod(idx + semitones, 12);
        return m.group(3) != null ? MINOR_KEYS[ni] : MAJOR_KEYS[ni];
    }

    /** 整份 ChordPro 移調:改寫所有和弦錨點、| 進行行與 {key:} metadata。 */
    public static String transposeContent(String content, int semitones) {
        Matcher keyMatcher = KEY_META_PATTERN.matcher(content);
        String targetKey = keyMatcher.find() ? transposeKey(keyMatcher.group(1), semitones) : null;

        return java.util.Arrays.stream(content.split("\n", -1))
                .map(line -> transposeLine(line, semitones, targetKey))
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private static String transposeLine(String line, int semitones, String targetKey) {
        String trimmed = line.trim();

        if (targetKey != null && trimmed.matches("^\\{\\s*key\\s*:.*")) {
            return KEY_META_PATTERN.matcher(line).replaceFirst("{key: " + targetKey + "}");
        }
        if (METADATA_PATTERN.matcher(trimmed).matches()) return line;
        if (isSectionHeader(trimmed)) return line;

        if (trimmed.startsWith("|")) {
            return BAR_CHORD_PATTERN.matcher(line).replaceAll(mr -> {
                String transposed = transposeChord(mr.group(), semitones, targetKey);
                return transposed != null ? transposed : mr.group();
            });
        }

        return ANCHOR_PATTERN.matcher(line).replaceAll(mr -> {
            String transposed = transposeChord(mr.group(1), semitones, targetKey);
            return transposed != null ? "[" + transposed + "]" : Matcher.quoteReplacement(mr.group());
        });
    }

    /** 段落標題 = 獨佔一行的 [Name] 且內容無法解析為和弦(與前端同一套規則)。 */
    public static boolean isSectionHeader(String trimmedLine) {
        Matcher m = SECTION_PATTERN.matcher(trimmedLine);
        return m.matches() && parse(m.group(1)) == null;
    }

    /**
     * 依段落標題行把全文切成段落字串(即時共編的鎖單位,前端 TS 有同規則實作)。
     * 段落 0 為第一個標題前的前導內容(若無前導行則第一段直接是標題段);
     * String.join("\n", sections) 可無損還原全文。
     */
    public static java.util.List<String> splitSections(String content) {
        String[] lines = content.split("\n", -1);
        java.util.List<java.util.List<String>> chunks = new java.util.ArrayList<>();
        java.util.List<String> current = new java.util.ArrayList<>();
        for (String line : lines) {
            if (isSectionHeader(line.trim())) {
                if (!chunks.isEmpty() || !current.isEmpty()) chunks.add(current);
                current = new java.util.ArrayList<>();
                current.add(line);
            } else {
                current.add(line);
            }
        }
        chunks.add(current);
        return chunks.stream().map(c -> String.join("\n", c)).toList();
    }

    /** 以新內容取代第 sectionIndex 段;index 超出範圍回 null。 */
    public static String applySectionUpdate(String content, int sectionIndex, String newSection) {
        java.util.List<String> sections = new java.util.ArrayList<>(splitSections(content));
        if (sectionIndex < 0 || sectionIndex >= sections.size()) return null;
        sections.set(sectionIndex, newSection);
        return String.join("\n", sections);
    }
}
