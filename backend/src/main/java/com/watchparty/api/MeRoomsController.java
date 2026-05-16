package com.watchparty.api;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.watchparty.auth.ApiMeJwtFilter;
import com.watchparty.persistence.SavedRoom;
import com.watchparty.persistence.SavedRoomRepository;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/me")
public class MeRoomsController {

	private final SavedRoomRepository savedRoomRepository;

	public MeRoomsController(SavedRoomRepository savedRoomRepository) {
		this.savedRoomRepository = savedRoomRepository;
	}

	public record SavedRoomResponse(String roomId, String roomLabel, Instant lastUsedAt) {
	}

	public record SaveRoomRequest(String roomId, String roomLabel) {
	}

	@GetMapping("/rooms")
	public List<SavedRoomResponse> listRooms(HttpServletRequest request) {
		String sub = requiredSub(request);
		return savedRoomRepository.findByGoogleSubOrderByLastUsedAtDesc(sub).stream()
			.map(r -> new SavedRoomResponse(r.getRoomId(), r.getRoomLabel(), r.getLastUsedAt()))
			.toList();
	}

	@PostMapping("/rooms")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void saveRoom(@RequestBody SaveRoomRequest body, HttpServletRequest request) {
		String sub = requiredSub(request);
		if (body.roomId() == null || body.roomId().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roomId required");
		}
		String roomId = body.roomId().trim();
		if (roomId.length() > 256) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roomId too long");
		}
		Instant now = Instant.now();
		String label = body.roomLabel() != null && !body.roomLabel().isBlank()
				? body.roomLabel().trim().substring(0, Math.min(128, body.roomLabel().trim().length()))
				: null;
		savedRoomRepository.findByGoogleSubAndRoomId(sub, roomId)
			.ifPresentOrElse(
					existing -> {
						existing.setLastUsedAt(now);
						if (label != null) {
							existing.setRoomLabel(label);
						}
						savedRoomRepository.save(existing);
					},
					() -> savedRoomRepository.save(new SavedRoom(sub, roomId, label, now)));
	}

	@DeleteMapping("/rooms/{roomId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteRoom(@PathVariable String roomId, HttpServletRequest request) {
		String sub = requiredSub(request);
		savedRoomRepository.deleteByGoogleSubAndRoomId(sub, roomId);
	}

	private static String requiredSub(HttpServletRequest request) {
		String sub = (String) request.getAttribute(ApiMeJwtFilter.ATTR_GOOGLE_SUB);
		if (sub == null) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		}
		return sub;
	}

}
