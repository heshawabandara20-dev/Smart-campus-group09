package com.smartcampus9.booking.service;

import com.smartcampus9.booking.model.Booking;
import com.smartcampus9.booking.model.BookingStatus;
import com.smartcampus9.booking.repository.BookingRepository;
import com.smartcampus9.common.exception.BadRequestException;
import com.smartcampus9.common.exception.ConflictException;
import com.smartcampus9.common.exception.ForbiddenException;
import com.smartcampus9.common.exception.NotFoundException;
import com.smartcampus9.notification.model.NotificationType;
import com.smartcampus9.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@Transactional
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    public BookingService(BookingRepository bookingRepository, NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
    }

    /**
     * User submits a booking request.
     * Conflict checking is done against existing APPROVED bookings only.
     */
    public Booking requestBooking(Long resourceId,
                                   Long requestedByUserId,
                                   LocalDate bookingDate,
                                   LocalTime startTime,
                                   LocalTime endTime,
                                   String purpose) {

        log.info("Creating booking request: resourceId={}, userId={}, date={}, start={}, end={}", 
                 resourceId, requestedByUserId, bookingDate, startTime, endTime);

        validateCommon(resourceId, requestedByUserId, bookingDate, startTime, endTime, purpose);

        if (hasApprovedConflict(resourceId, bookingDate, startTime, endTime, null)) {
            log.warn("Conflict detected for booking: resourceId={}, date={}, start={}, end={}", 
                     resourceId, bookingDate, startTime, endTime);
            throw new ConflictException(
                    "Booking time range conflicts with an existing approved booking for this resource."
            );
        }

        Booking booking = new Booking(
                resourceId,
                requestedByUserId,
                bookingDate,
                startTime,
                endTime,
                purpose
        );

        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);
        log.info("Booking created successfully with id: {}", saved.getId());
        
        // Notify admins about the new booking request
        notificationService.createForAdminsOnly(NotificationType.BOOKING_STATUS_CHANGED,
                "New booking request #" + saved.getId() + " requires approval.", null);
        
        return saved;
    }

    @Transactional(readOnly = true)
    public Booking getById(Long bookingId) {
        return getBookingOrThrow(bookingId);
    }

    @Transactional(readOnly = true)
    public List<Booking> listAll() {
        return bookingRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Booking> listByStatus(BookingStatus status) {
        if (status == null) {
            throw new BadRequestException("status is required.");
        }
        return bookingRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<Booking> listByUser(Long requestedByUserId) {
        if (requestedByUserId == null || requestedByUserId <= 0) {
            throw new BadRequestException("Invalid requestedByUserId.");
        }
        return bookingRepository.findByRequestedByUserId(requestedByUserId);
    }

    /**
     * Admin approves a PENDING booking.
     * Conflict checking is performed again to ensure consistency.
     */
    public Booking approveBooking(Long bookingId, String adminReason) {
        Booking booking = getBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only PENDING bookings can be approved.");
        }

        if (hasApprovedConflict(
                booking.getResourceId(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getId()
        )) {
            throw new ConflictException("Cannot approve: time range conflicts with an existing approved booking.");
        }

        booking.setStatus(BookingStatus.APPROVED);
        booking.setAdminDecisionReason(safeReason(adminReason));
        Booking saved = bookingRepository.save(booking);
        notificationService.create(saved.getRequestedByUserId(), NotificationType.BOOKING_STATUS_CHANGED,
                "Your booking #" + saved.getId() + " has been APPROVED.", null);
        return saved;
    }

    /**
     * Admin rejects a PENDING booking.
     */
    public Booking rejectBooking(Long bookingId, String adminReason) {
        Booking booking = getBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only PENDING bookings can be rejected.");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setAdminDecisionReason(safeReason(adminReason));
        Booking saved = bookingRepository.save(booking);
        notificationService.create(saved.getRequestedByUserId(), NotificationType.BOOKING_STATUS_CHANGED,
                "Your booking #" + saved.getId() + " has been REJECTED." +
                (safeReason(adminReason) != null ? " Reason: " + safeReason(adminReason) : ""), null);
        return saved;
    }

    /**
     * User cancels their booking.
     * Allowed workflow transitions:
     * - PENDING -> CANCELLED
     * - APPROVED -> CANCELLED
     */
    public Booking cancelBooking(Long bookingId, Long cancelledByUserId) {
        Booking booking = getBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.APPROVED && booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException("Only PENDING or APPROVED bookings can be cancelled.");
        }

        if (booking.getRequestedByUserId() == null || !booking.getRequestedByUserId().equals(cancelledByUserId)) {
            throw new ForbiddenException("You can only cancel your own bookings.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return bookingRepository.save(booking);
    }

    /**
     * Backward-compatible helper: cancels a user's own PENDING booking request.
     */
    public void deletePendingBooking(Long bookingId, Long requestedByUserId) {
        Booking updated = cancelBooking(bookingId, requestedByUserId);
        if (updated.getStatus() != BookingStatus.CANCELLED) {
            throw new BadRequestException("Failed to cancel the pending booking.");
        }
    }

    private Booking getBookingOrThrow(Long bookingId) {
        if (bookingId == null || bookingId <= 0) {
            throw new BadRequestException("Invalid booking id.");
        }

        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking not found with id: " + bookingId));
    }

    private boolean hasApprovedConflict(Long resourceId,
                                         LocalDate bookingDate,
                                         LocalTime startTime,
                                         LocalTime endTime,
                                         Long excludeBookingId) {
        long conflicts = bookingRepository.countApprovedOverlapping(
                resourceId,
                bookingDate,
                startTime,
                endTime,
                excludeBookingId,
                BookingStatus.APPROVED
        );
        return conflicts > 0;
    }

    private void validateCommon(Long resourceId,
                                  Long requestedByUserId,
                                  LocalDate bookingDate,
                                  LocalTime startTime,
                                  LocalTime endTime,
                                  String purpose) {
        
        // Resource ID validation
        if (resourceId == null || resourceId <= 0) {
            throw new BadRequestException("resourceId must be a positive number.");
        }
        
        // User ID validation
        if (requestedByUserId == null || requestedByUserId <= 0) {
            throw new BadRequestException("requestedByUserId must be a positive number.");
        }
        
        // Date validation - FIXED: Allows today's date
        if (bookingDate == null) {
            throw new BadRequestException("bookingDate is required.");
        }
        if (bookingDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("bookingDate cannot be in the past.");
        }
        
        // Time validation
        if (startTime == null || endTime == null) {
            throw new BadRequestException("startTime and endTime are required.");
        }
        if (startTime.equals(endTime)) {
            throw new BadRequestException("startTime cannot be equal to endTime.");
        }
        if (!startTime.isBefore(endTime)) {
            throw new BadRequestException("startTime must be before endTime.");
        }
        
        // Optional: Minimum booking duration (30 minutes)
        if (endTime.isBefore(startTime.plusMinutes(30))) {
            throw new BadRequestException("Booking must be at least 30 minutes long.");
        }
        
        // Purpose validation
        if (purpose == null || purpose.trim().isEmpty()) {
            throw new BadRequestException("purpose is required.");
        }
        if (purpose.length() > 500) {
            throw new BadRequestException("purpose must not exceed 500 characters.");
        }
        
        log.debug("Validation passed for booking request");
    }

    private String safeReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}