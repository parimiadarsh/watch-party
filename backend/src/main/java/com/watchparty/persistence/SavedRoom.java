package com.watchparty.persistence;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "saved_room", uniqueConstraints = {
		@UniqueConstraint(name = "uk_sub_room", columnNames = { "google_sub", "room_id" })
})
public class SavedRoom {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "google_sub", nullable = false, length = 64)
	private String googleSub;

	@Column(name = "room_id", nullable = false, length = 256)
	private String roomId;

	@Column(name = "room_label", length = 128)
	private String roomLabel;

	@Column(name = "last_used_at", nullable = false)
	private Instant lastUsedAt;

	protected SavedRoom() {
	}

	public SavedRoom(String googleSub, String roomId, String roomLabel, Instant lastUsedAt) {
		this.googleSub = googleSub;
		this.roomId = roomId;
		this.roomLabel = roomLabel;
		this.lastUsedAt = lastUsedAt;
	}

	public Long getId() {
		return id;
	}

	public String getGoogleSub() {
		return googleSub;
	}

	public String getRoomId() {
		return roomId;
	}

	public String getRoomLabel() {
		return roomLabel;
	}

	public void setRoomLabel(String roomLabel) {
		this.roomLabel = roomLabel;
	}

	public Instant getLastUsedAt() {
		return lastUsedAt;
	}

	public void setLastUsedAt(Instant lastUsedAt) {
		this.lastUsedAt = lastUsedAt;
	}

}
