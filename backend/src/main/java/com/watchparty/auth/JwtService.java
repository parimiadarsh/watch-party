package com.watchparty.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	private final SecretKey key;

	public JwtService(@Value("${watchparty.jwt.secret}") String secret) {
		byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("watchparty.jwt.secret must be at least 32 bytes");
		}
		this.key = Keys.hmacShaKeyFor(bytes);
	}

	public String createToken(String googleSub) {
		Instant now = Instant.now();
		return Jwts.builder()
			.subject(googleSub)
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plus(30, ChronoUnit.DAYS)))
			.signWith(key)
			.compact();
	}

	public Optional<String> parseSubject(String bearerToken) {
		if (bearerToken == null || bearerToken.isBlank()) {
			return Optional.empty();
		}
		try {
			String sub = Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(bearerToken)
				.getPayload()
				.getSubject();
			return Optional.ofNullable(sub);
		}
		catch (JwtException | IllegalArgumentException e) {
			return Optional.empty();
		}
	}

}
