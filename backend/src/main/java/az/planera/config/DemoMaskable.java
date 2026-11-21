package az.planera.config;

/**
 * A response that can hold personal data of real customers and knows how to
 * hide it. {@link DemoResponseAdvice} calls {@link #forDemo()} on every such
 * body (also inside lists and pages) before it is written for a public demo
 * account, so no endpoint has to remember to do it.
 */
public interface DemoMaskable<T> {

    /** The same data as a public demo account may see it. */
    T forDemo();
}
