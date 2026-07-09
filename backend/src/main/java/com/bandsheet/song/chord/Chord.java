package com.bandsheet.song.chord;

/** 解析後的和弦。bass 可為 null。 */
public record Chord(String root, String suffix, String bass) {}
