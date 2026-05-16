package com.watchparty.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final GoogleTokenVerifierService googleVerifier;

	private final JwtService jwtService;

	public AuthController(GoogleTokenVerifierService googleVerifier, JwtService jwtService) {
		this.googleVerifier = googleVerifier;
		this.jwtService = jwtService;
	}

	public record GoogleAuthRequest(String idToken) {
	}

	public record AuthResponse(String token, String email, String name) {
	}

	@PostMapping("/google")
	public ResponseEntity<?> google(@RequestBody GoogleAuthRequest body) {
		if (!googleVerifier.isConfigured()) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
				.body(Map.of("error", "Google sign-in is not configured (set GOOGLE_CLIENT_ID)."));
		}
		if (body.idToken() == null || body.idToken().isBlank()) {
			return ResponseEntity.badRequest().body(Map.of("error", "idToken is required"));
		}
		var userOpt = googleVerifier.verifyAndParse(body.idToken());
		if (userOpt.isEmpty()) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Google token"));
		}
		var user = userOpt.get();
		String token = jwtService.createToken(user.sub());
		return ResponseEntity.ok(new AuthResponse(
			token,
			user.email() != null ? user.email() : "",
			user.name() != null ? user.name() : ""));
	}

}
