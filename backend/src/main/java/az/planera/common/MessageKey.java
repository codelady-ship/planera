package az.planera.common;

/** A code from {@code messages*.properties} with its {0}, {1}... arguments. Built with {@link Messages#key}. */
public record MessageKey(String code, Object[] args) {}
