package com.watchparty.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import com.watchparty.auth.ApiMeJwtFilter;
import com.watchparty.auth.JwtService;

@Configuration
public class AuthFilterConfig {

	@Bean
	public FilterRegistrationBean<ApiMeJwtFilter> apiMeJwtFilterRegistration(JwtService jwtService) {
		FilterRegistrationBean<ApiMeJwtFilter> reg = new FilterRegistrationBean<>();
		reg.setFilter(new ApiMeJwtFilter(jwtService));
		reg.addUrlPatterns("/api/me/*");
		reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
		return reg;
	}

}
