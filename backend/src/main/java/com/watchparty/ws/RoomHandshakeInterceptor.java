package com.watchparty.ws;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
public class RoomHandshakeInterceptor implements HandshakeInterceptor {

	@Override
	public boolean beforeHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
			@NonNull WebSocketHandler wsHandler, @NonNull Map<String, Object> attributes) {
		URI uri = request.getURI();
		String query = uri.getRawQuery();
		Map<String, String> params = parseQuery(query);
		String roomId = params.get("room");
		String clientId = params.get("clientId");
		String name = params.getOrDefault("name", "Guest");
		if (roomId == null || roomId.isBlank() || clientId == null || clientId.isBlank()) {
			return false;
		}
		attributes.put(RoomAttributeKeys.ROOM_ID, roomId.trim());
		attributes.put(RoomAttributeKeys.CLIENT_ID, clientId.trim());
		attributes.put(RoomAttributeKeys.DISPLAY_NAME, name.length() > 48 ? name.substring(0, 48) : name);
		return true;
	}

	@Override
	public void afterHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
			@NonNull WebSocketHandler wsHandler, Exception exception) {
		// no-op
	}

	private static Map<String, String> parseQuery(String query) {
		Map<String, String> map = new LinkedHashMap<>();
		if (query == null || query.isEmpty()) {
			return map;
		}
		for (String part : query.split("&")) {
			int eq = part.indexOf('=');
			if (eq <= 0) {
				continue;
			}
			String key = urlDecode(part.substring(0, eq));
			String value = urlDecode(part.substring(eq + 1));
			map.put(key, value);
		}
		return map;
	}

	private static String urlDecode(String s) {
		try {
			return java.net.URLDecoder.decode(s, java.nio.charset.StandardCharsets.UTF_8);
		}
		catch (Exception e) {
			return s;
		}
	}

}
