package com.watchparty.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.watchparty.ws.RoomHandshakeInterceptor;
import com.watchparty.ws.RoomWebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

	private final RoomWebSocketHandler roomWebSocketHandler;

	private final RoomHandshakeInterceptor roomHandshakeInterceptor;

	public WebSocketConfig(RoomWebSocketHandler roomWebSocketHandler,
			RoomHandshakeInterceptor roomHandshakeInterceptor) {
		this.roomWebSocketHandler = roomWebSocketHandler;
		this.roomHandshakeInterceptor = roomHandshakeInterceptor;
	}

	@Override
	public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
		registry.addHandler(roomWebSocketHandler, "/ws")
			.addInterceptors(roomHandshakeInterceptor)
			.setAllowedOriginPatterns(
					"http://localhost:*",
					"http://127.0.0.1:*",
					"http://*:*",
					"https://*.ts.net",
					"http://*.ts.net");
	}

}
