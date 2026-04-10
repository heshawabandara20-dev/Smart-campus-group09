package com.smartcampus9.booking.repository;

import com.smartcampus9.booking.model.Booking;
import com.smartcampus9.booking.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
        SELECT COUNT(b)
        FROM Booking b
        WHERE b.resourceId = :resourceId
          AND b.bookingDate = :bookingDate
          AND b.status = :approvedStatus
          AND (:excludeId IS NULL OR b.id <> :excludeId)
          AND b.startTime < :newEndTime
          AND b.endTime > :newStartTime
        """)
    long countApprovedOverlapping(
            @Param("resourceId") Long resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("newStartTime") LocalTime newStartTime,
            @Param("newEndTime") LocalTime newEndTime,
            @Param("excludeId") Long excludeId,
            @Param("approvedStatus") BookingStatus approvedStatus
    );

    List<Booking> findByRequestedByUserId(Long requestedByUserId);

    List<Booking> findByStatus(BookingStatus status);
}

