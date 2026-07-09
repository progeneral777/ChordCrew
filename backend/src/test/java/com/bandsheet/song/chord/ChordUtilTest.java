package com.bandsheet.song.chord;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class ChordUtilTest {

    // --- parse ---

    @ParameterizedTest
    @CsvSource({
            "C,      C,  '',     ",
            "F#m,    F#, m,      ",
            "Bb7,    Bb, 7,      ",
            "Gmaj7,  G,  maj7,   ",
            "Am7b5,  A,  m7b5,   ",
            "Dsus4,  D,  sus4,   ",
            "C/E,    C,  '',    E",
            "E7#9,   E,  7#9,    ",
            "C6/9,   C,  6/9,    ",
            "Cm/Bb,  C,  m,     Bb",
    })
    void parsesValidChords(String input, String root, String suffix, String bass) {
        Chord chord = ChordUtil.parse(input);
        assertThat(chord).isNotNull();
        assertThat(chord.root()).isEqualTo(root);
        assertThat(chord.suffix()).isEqualTo(suffix);
        assertThat(chord.bass()).isEqualTo(bass);
    }

    @ParameterizedTest
    @ValueSource(strings = {"H", "Cx", "[Verse]", "c"})
    void rejectsInvalidChords(String input) {
        assertThat(ChordUtil.parse(input)).isNull();
    }

    @Test
    void rejectsNullAndEmpty() {
        assertThat(ChordUtil.parse(null)).isNull();
        assertThat(ChordUtil.parse("")).isNull();
    }

    // --- transpose:CHORD_SPEC §4 必過測試案例 ---

    @ParameterizedTest
    @CsvSource({
            "C,      2, D,  D",
            "F#m7,   1, Ab, Gm7",
            "Bb,     2, C,  C",
            "C/E,    2, D,  D/F#",
            "Am7b5,  3, Cm, Cm7b5",
            "E7#9,  -4, C,  C7#9",
            "G,      5, C,  C",
            "B,      1, Db, C",
            "F,     -1, E,  E",
            "Dsus4,  7, A,  Asus4",
    })
    void specTransposeCases(String chord, int semitones, String targetKey, String expected) {
        assertThat(ChordUtil.transposeChord(chord, semitones, targetKey)).isEqualTo(expected);
    }

    @Test
    void defaultsToSharpWithoutKey() {
        assertThat(ChordUtil.transposeChord("A", 1, null)).isEqualTo("A#");
    }

    @Test
    void usesFlatsForFlatKeys() {
        assertThat(ChordUtil.transposeChord("A", 1, "Bb")).isEqualTo("Bb");
    }

    @Test
    void invalidChordTransposesToNull() {
        assertThat(ChordUtil.transposeChord("H", 2, "D")).isNull();
        assertThat(ChordUtil.transposeChord("Cx", 2, "D")).isNull();
    }

    // --- transposeKey ---

    @ParameterizedTest
    @CsvSource({
            "G,   1, Ab",
            "C,   1, Db",
            "Am,  3, Cm",
            "C,   2, D",
            "F,  -1, E",
            "E,   6, Bb",
    })
    void transposesKeys(String key, int semitones, String expected) {
        assertThat(ChordUtil.transposeKey(key, semitones)).isEqualTo(expected);
    }

    // --- isFlatKey ---

    @ParameterizedTest
    @ValueSource(strings = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"})
    void flatKeys(String key) {
        assertThat(ChordUtil.isFlatKey(key)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"C", "G", "D", "A", "E", "B", "F#", "C#", "Am", "Em", "Bm", "F#m", "C#m"})
    void sharpKeys(String key) {
        assertThat(ChordUtil.isFlatKey(key)).isFalse();
    }

    // --- transposeContent ---

    private static final String SAMPLE = """
            {title: 小情歌}
            {key: C}
            {bpm: 72}

            [Intro]
            | C | G/B | Am | F |

            [Verse 1]
            這是一首[C]簡單的小情歌 唱著[G/B]人們心腸的曲折
            我想我很[Am]快樂 當有你的[F]溫熱 腳邊的空[G]氣轉了""";

    @Test
    void transposesWholeContent() {
        String result = ChordUtil.transposeContent(SAMPLE, 2);
        assertThat(result).contains("{key: D}");
        assertThat(result).contains("| D | A/C# | Bm | G |");
        assertThat(result).contains("這是一首[D]簡單的小情歌 唱著[A/C#]人們心腸的曲折");
        assertThat(result).contains("[Verse 1]");     // 段落標題不動
        assertThat(result).contains("{title: 小情歌}"); // 其他 metadata 不動
    }

    @Test
    void usesFlatsWhenTargetKeyIsFlat() {
        String result = ChordUtil.transposeContent("{key: C}\n歌[E]詞[A]", 1);
        assertThat(result).contains("{key: Db}");
        assertThat(result).contains("歌[F]詞[Bb]");
    }

    @Test
    void keepsUnparseableChordsAsIs() {
        assertThat(ChordUtil.transposeContent("歌詞[Cx]不變[C]會轉", 2))
                .isEqualTo("歌詞[Cx]不變[D]會轉");
    }

    @Test
    void preservesTrailingEmptyLines() {
        assertThat(ChordUtil.transposeContent("[C]\n", 2)).isEqualTo("[D]\n");
    }
}
