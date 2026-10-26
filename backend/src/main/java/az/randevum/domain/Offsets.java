package az.randevum.domain;

import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/** Reminder offsets (minutes before the start) stored as "60,15,0": largest first, no duplicates. */
public final class Offsets {

    private Offsets() {}

    public static List<Integer> parse(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return Arrays.stream(text.split(","))
                .map(String::strip)
                .filter(s -> !s.isEmpty())
                .map(Integer::valueOf)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();
    }

    public static String join(Collection<Integer> offsets) {
        return offsets.stream()
                .distinct()
                .sorted(Comparator.reverseOrder())
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }
}
