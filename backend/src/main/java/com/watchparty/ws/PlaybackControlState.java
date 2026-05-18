package com.watchparty.ws;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class PlaybackControlState {

	/** "single" = one controller; "dual" = shared control with unanimous play */
	private volatile String controlMode = "dual";

	private volatile String controllerId;

	private final Set<String> playReady = ConcurrentHashMap.newKeySet();

	public String getControlMode() {
		return controlMode;
	}

	public void setControlMode(String controlMode) {
		this.controlMode = controlMode;
	}

	public String getControllerId() {
		return controllerId;
	}

	public void setControllerId(String controllerId) {
		this.controllerId = controllerId;
	}

	public Set<String> getPlayReady() {
		return Set.copyOf(playReady);
	}

	public void addPlayReady(String clientId) {
		playReady.add(clientId);
	}

	public void removePlayReady(String clientId) {
		playReady.remove(clientId);
	}

	public void clearPlayReady() {
		playReady.clear();
	}

	public boolean isAllReady(java.util.Collection<String> peerIds) {
		if (peerIds.isEmpty()) {
			return true;
		}
		return playReady.containsAll(peerIds);
	}

}
