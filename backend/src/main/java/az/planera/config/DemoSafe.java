package az.planera.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a response type that a public demo account may read as it is: it
 * holds no personal data of other people. The value says why. A response
 * type that is neither {@code @DemoSafe} nor {@link DemoMaskable} is refused
 * for demo accounts by {@link DemoResponseAdvice}.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DemoSafe {

    /** Why nothing has to be hidden. */
    String value();
}
