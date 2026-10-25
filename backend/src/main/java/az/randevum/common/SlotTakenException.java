package az.randevum.common;

import java.util.List;

/** 409 with nearby free times of the same day, so the client can offer them right away (#21). */
public class SlotTakenException extends ConflictException {

    private final List<String> alternatives;

    public SlotTakenException(List<String> alternatives) {
        super("Bu vaxt artıq tutulub. Başqa vaxt seçin.");
        this.alternatives = List.copyOf(alternatives);
    }

    public List<String> getAlternatives() {
        return alternatives;
    }
}
