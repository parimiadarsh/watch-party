package com.watchparty.auth;

import java.util.Collections;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

@Service
public class GoogleTokenVerifierService {

	private final String clientId;

	public GoogleTokenVerifierService(@Value("${watchparty.google.client-id:}") String clientId) {
		this.clientId = clientId;
	}

	public boolean isConfigured() {
		return clientId != null && !clientId.isBlank();
	}

	public Optional<GoogleUser> verifyAndParse(String idTokenString) {
		if (!isConfigured()) {
			return Optional.empty();
		}
		try {
			GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
				.setAudience(Collections.singletonList(clientId))
				.build();
			GoogleIdToken idToken = verifier.verify(idTokenString);
			if (idToken == null) {
				return Optional.empty();
			}
			Payload payload = idToken.getPayload();
			String sub = payload.getSubject();
			if (sub == null || sub.isBlank()) {
				return Optional.empty();
			}
			String email = payload.getEmail();
			Object name = payload.get("name");
			return Optional.of(new GoogleUser(sub, email, name instanceof String ? (String) name : null));
		}
		catch (Exception e) {
			return Optional.empty();
		}
	}

	public record GoogleUser(String sub, String email, String name) {
	}

}
