package com.watchparty.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedRoomRepository extends JpaRepository<SavedRoom, Long> {

	List<SavedRoom> findByGoogleSubOrderByLastUsedAtDesc(String googleSub);

	java.util.Optional<SavedRoom> findByGoogleSubAndRoomId(String googleSub, String roomId);

	void deleteByGoogleSubAndRoomId(String googleSub, String roomId);

}
