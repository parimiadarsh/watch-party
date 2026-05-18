package com.watchparty.ws;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
public class RoomRegistry {

	private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> rooms = new ConcurrentHashMap<>();

	private final ConcurrentHashMap<String, PlaybackControlState> playbackByRoom = new ConcurrentHashMap<>();

	public void add(String roomId, String clientId, WebSocketSession session) {
		rooms.computeIfAbsent(roomId, r -> new ConcurrentHashMap<>()).put(clientId, session);
	}

	public void remove(WebSocketSession session) {
		String roomId = attr(session, RoomAttributeKeys.ROOM_ID);
		String clientId = attr(session, RoomAttributeKeys.CLIENT_ID);
		if (roomId == null || clientId == null) {
			return;
		}
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		if (room == null) {
			return;
		}
		room.remove(clientId, session);
		PlaybackControlState playback = playbackByRoom.get(roomId);
		if (playback != null) {
			playback.removePlayReady(clientId);
			if (clientId.equals(playback.getControllerId())) {
				playback.setControllerId(room.isEmpty() ? null : room.keySet().iterator().next());
			}
		}
		if (room.isEmpty()) {
			rooms.remove(roomId, room);
			playbackByRoom.remove(roomId);
		}
	}

	public PlaybackControlState playbackState(String roomId) {
		return playbackByRoom.computeIfAbsent(roomId, k -> new PlaybackControlState());
	}

	public int peerCount(String roomId) {
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		return room == null ? 0 : room.size();
	}

	public Set<String> peerIds(String roomId) {
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		if (room == null || room.isEmpty()) {
			return Collections.emptySet();
		}
		return Set.copyOf(room.keySet());
	}

	public List<PeerView> peersExcept(String roomId, String exceptClientId) {
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		if (room == null || room.isEmpty()) {
			return Collections.emptyList();
		}
		List<PeerView> list = new ArrayList<>();
		for (Map.Entry<String, WebSocketSession> e : room.entrySet()) {
			if (e.getKey().equals(exceptClientId)) {
				continue;
			}
			String name = attr(e.getValue(), RoomAttributeKeys.DISPLAY_NAME);
			list.add(new PeerView(e.getKey(), name != null ? name : "Guest"));
		}
		return list;
	}

	public void broadcastExcept(String roomId, String excludeClientId, String json) {
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		if (room == null) {
			return;
		}
		for (Map.Entry<String, WebSocketSession> e : room.entrySet()) {
			if (excludeClientId != null && e.getKey().equals(excludeClientId)) {
				continue;
			}
			send(e.getValue(), json);
		}
	}

	public void broadcastAll(String roomId, String json) {
		broadcastExcept(roomId, null, json);
	}

	public void sendTo(String roomId, String targetClientId, String json) {
		ConcurrentHashMap<String, WebSocketSession> room = rooms.get(roomId);
		if (room == null) {
			return;
		}
		WebSocketSession target = room.get(targetClientId);
		if (target != null) {
			send(target, json);
		}
	}

	public void sendToSession(WebSocketSession session, String json) {
		send(session, json);
	}

	private static void send(WebSocketSession session, String json) {
		if (!session.isOpen()) {
			return;
		}
		try {
			session.sendMessage(new TextMessage(json));
		}
		catch (IOException ignored) {
			// drop — client may have disconnected
		}
	}

	private static String attr(WebSocketSession session, String key) {
		Object v = session.getAttributes().get(key);
		return v instanceof String ? (String) v : null;
	}

	public record PeerView(String clientId, String displayName) {
	}

}
