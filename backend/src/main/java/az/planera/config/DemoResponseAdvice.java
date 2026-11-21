package az.planera.config;

import az.planera.common.Messages;
import az.planera.common.PageResponse;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * The one place where answers for public demo accounts are anonymized.
 *
 * <p>Every body an API controller returns to a token with {@code demo: true}
 * passes through here, whatever the endpoint: a {@link DemoMaskable} is
 * replaced by its {@link DemoMaskable#forDemo()} copy (also inside lists and
 * {@link PageResponse}), a {@link DemoSafe} type passes as it is, and
 * anything else is refused with 403. A new endpoint therefore cannot show
 * customers' data to the demo by forgetting to mask it: until its response
 * type is classified, the demo gets nothing. Real accounts are not touched.
 */
@RestControllerAdvice(basePackages = "az.planera")
public class DemoResponseAdvice implements ResponseBodyAdvice<Object> {

    private static final Logger log = LoggerFactory.getLogger(DemoResponseAdvice.class);

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {
        if (!DemoReadOnlyFilter.isDemo(SecurityContextHolder.getContext().getAuthentication())) {
            return body;
        }
        try {
            return forDemo(body);
        } catch (NotClassified e) {
            log.warn("Demo account refused on {}: response type {} is neither @DemoSafe nor DemoMaskable",
                    request.getURI().getPath(), e.type.getName());
            response.setStatusCode(HttpStatus.FORBIDDEN);
            String language = request.getHeaders().getFirst(HttpHeaders.ACCEPT_LANGUAGE);
            return ProblemDetail.forStatusAndDetail(
                    HttpStatus.FORBIDDEN, Messages.get("demo.hidden", Messages.locale(language)));
        }
    }

    /** The body as a demo account may see it; throws when a type in it has not been classified. */
    static Object forDemo(Object body) {
        if (body == null || body instanceof ProblemDetail) {
            return body;
        }
        if (body instanceof DemoMaskable<?> maskable) {
            return maskable.forDemo();
        }
        if (body instanceof Collection<?> items) {
            List<Object> masked = new ArrayList<>(items.size());
            for (Object item : items) {
                masked.add(forDemo(item));
            }
            return masked;
        }
        if (body instanceof PageResponse<?> page) {
            return new PageResponse<>(
                    (List<?>) forDemo(page.content()), page.page(), page.size(), page.totalElements(),
                    page.totalPages());
        }
        if (body.getClass().isAnnotationPresent(DemoSafe.class)) {
            return body;
        }
        throw new NotClassified(body.getClass());
    }

    private static final class NotClassified extends RuntimeException {
        private final Class<?> type;

        private NotClassified(Class<?> type) {
            super(type.getName(), null, false, false);
            this.type = type;
        }
    }
}
