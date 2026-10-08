package com.pulse;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import java.io.IOException;

/** Serves the built React app from classpath:/static and falls back to index.html for client routes. */
@Configuration
class SpaConfig implements WebMvcConfigurer {
  @Override public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/**").addResourceLocations("classpath:/static/").resourceChain(true)
      .addResolver(new PathResourceResolver() {
        @Override protected Resource getResource(String path, Resource location) throws IOException {
          if (path.startsWith("api/") || path.startsWith("ws")) return null;
          Resource r = location.createRelative(path);
          if (r.exists() && r.isReadable()) return r;
          Resource index = new ClassPathResource("/static/index.html");
          return index.exists() ? index : null;
        }
      });
  }
}
