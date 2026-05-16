package com.watchparty.ws;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Component
public class RoomWebSocketHandler extends TextWebSocketHandler {

	private static final Logger log = LoggerFactory.getLogger(RoomWebSocketHandler.class);

	private final RoomRegistry registry;

	private final ObjectMapper objectMapper;

	public RoomWebSocketHandler(RoomRegistry registry, ObjectMapper objectMapper) {
		this.registry = registry;
		this.objectMapper = objectMapper;
	}

	@Override
	public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
		String roomId = attr(session, RoomAttributeKeys.ROOM_ID);
		String clientId = attr(session, RoomAttributeKeys.CLIENT_ID);
		String displayName = attr(session, RoomAttributeKeys.DISPLAY_NAME);
		if (roomId == null || clientId == null) {
			session.close(CloseStatus.BAD_DATA);
			return;
		}
		registry.add(roomId, clientId, session);
		// Current peers (excluding self)
		List<RoomRegistry.PeerView> others = registry.peersExcept(roomId, clientId);
		ObjectNode roster = objectMapper.createObjectNode();
		roster.put("type", "roster");
		ArrayNode arr = roster.putArray("peers");
		for (RoomRegistry.PeerView p : others) {
			ObjectNode o = arr.addObject();
			o.put("clientId", p.clientId());
			o.put("displayName", p.displayName());
		}
		registry.sendToSession(session, objectMapper.writeValueAsString(roster));

		ObjectNode joined = objectMapper.createObjectNode();
		joined.put("type", "peer-joined");
		joined.put("clientId", clientId);
		joined.put("displayName", displayName != null ? displayName : "Guest");
		registry.broadcastExcept(roomId, clientId, objectMapper.writeValueAsString(joined));
	}

	@Override
	protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) {
		String roomId = attr(session, RoomAttributeKeys.ROOM_ID);
		String fromId = attr(session, RoomAttributeKeys.CLIENT_ID);
		String fromName = attr(session, RoomAttributeKeys.DISPLAY_NAME);
		if (roomId == null || fromId == null) {
			return;
		}
		try {
			JsonNode root = objectMapper.readTree(message.getPayload());
			String type = root.path("type").asText("");
			switch (type) {
				case "chat" -> relayChat(roomId, fromId, fromName, root);
				case "signal" -> relaySignal(roomId, fromId, root);
				case "playback" -> relayPlayback(roomId, fromId, root);
				case "share-state" -> relayShareState(roomId, fromId, root);
				default -> log.debug("Unknown message type: {}", type);
			}
		}
		catch (Exception e) {
			log.warn("Bad WS payload", e);
		}
	}

	@Override
	public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
		String roomId = attr(session, RoomAttributeKeys.ROOM_ID);
		String clientId = attr(session, RoomAttributeKeys.CLIENT_ID);
		registry.remove(session);
		if (roomId != null && clientId != null) {
			try {
				ObjectNode left = objectMapper.createObjectNode();
				left.put("type", "peer-left");
				left.put("clientId", clientId);
				registry.broadcastExcept(roomId, clientId, objectMapper.writeValueAsString(left));
			}
			catch (Exception ignored) {
			}
		}
	}

	private void relayChat(String roomId, String fromId, String fromName, JsonNode root) throws Exception {
		String text = root.path("text").asText("").trim();
		if (text.isEmpty() || text.length() > 4000) {
			return;
		}
		ObjectNode out = objectMapper.createObjectNode();
		out.put("type", "chat");
		out.put("fromId", fromId);
		out.put("fromName", fromName != null ? fromName : "Guest");
		out.put("text", text);
		out.put("at", System.currentTimeMillis());
		registry.broadcastExcept(roomId, null, objectMapper.writeValueAsString(out));
	}

	private void relaySignal(String roomId, String fromId, JsonNode root) throws Exception {
		String targetId = root.path("targetId").asText(null);
		ObjectNode out = objectMapper.createObjectNode();
		out.put("type", "signal");
		out.put("fromId", fromId);
		out.set("payload", root.get("payload"));
		String json = objectMapper.writeValueAsString(out);
		if (targetId != null && !targetId.isBlank()) {
			registry.sendTo(roomId, targetId, json);
		}
		else {
			registry.broadcastExcept(roomId, fromId, json);
		}
	}

	private void relayPlayback(String roomId, String fromId, JsonNode root) throws Exception {
		ObjectNode out = objectMapper.createObjectNode();
		out.put("type", "playback");
		out.put("fromId", fromId);
		out.set("action", root.get("action"));
		if (root.has("currentTime")) {
			out.set("currentTime", root.get("currentTime"));
		}
		if (root.has("videoUrl")) {
			out.set("videoUrl", root.get("videoUrl"));
		}
		out.put("emittedAt", System.currentTimeMillis());
		registry.broadcastExcept(roomId, fromId, objectMapper.writeValueAsString(out));
	}

	private void relayShareState(String roomId, String fromId, JsonNode root) throws Exception {
		ObjectNode out = objectMapper.createObjectNode();
		out.put("type", "share-state");
		out.put("fromId", fromId);
		out.put("sharing", root.path("sharing").asBoolean());
		registry.broadcastExcept(roomId, fromId, objectMapper.writeValueAsString(out));
	}

	private static String attr(WebSocketSession session, String key) {
		Object v = session.getAttributes().get(key);
		return v instanceof String ? (String) v : null;
	}

}
