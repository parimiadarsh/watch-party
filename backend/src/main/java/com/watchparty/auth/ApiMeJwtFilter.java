package com.watchparty.auth;

import java.io.IOException;

import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class ApiMeJwtFilter extends OncePerRequestFilter {

	public static final String ATTR_GOOGLE_SUB = "watchpartyGoogleSub";

	private final JwtService jwtService;

	public ApiMeJwtFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain) throws ServletException, IOException {
		if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
			filterChain.doFilter(request, response);
			return;
		}
		String header = request.getHeader("Authorization");
		if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing or invalid Authorization header");
			return;
		}
		String token = header.substring(7).trim();
		var sub = jwtService.parseSubject(token);
		if (sub.isEmpty()) {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired session");
			return;
		}
		request.setAttribute(ATTR_GOOGLE_SUB, sub.get());
		filterChain.doFilter(request, response);
	}

}
