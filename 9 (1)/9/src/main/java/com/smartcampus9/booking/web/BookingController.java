package com.smartcampus9.booking.web;

import com.smartcampus9.booking.dto.BookingDecisionDto;
import com.smartcampus9.booking.dto.BookingRequestDto;
import com.smartcampus9.booking.dto.BookingResponseDto;
import com.smartcampus9.booking.model.Booking;
import com.smartcampus9.booking.model.BookingStatus;
import com.smartcampus9.booking.service.BookingService;
import com.smartcampus9.auth.security.UserPrincipal;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private static final Logger log = LoggerFactory.getLogger(BookingController.class);

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public BookingResponseDto create(@Valid @RequestBody BookingRequestDto dto,
                                      @AuthenticationPrincipal UserPrincipal principal) {
        
        log.info("Creating booking request");
        
        if (principal == null) {
            log.error("Principal is null - user not authenticated");
            throw new RuntimeException("User not authenticated. Please login again.");
        }
        
        log.info("User ID: {}, Email: {}", principal.getUserId(), principal.getEmail());
        
        Booking booking = bookingService.requestBooking(
                dto.getResourceId(),
                principal.getUserId(),
                dto.getBookingDate(),
                dto.getStartTime(),
                dto.getEndTime(),
                dto.getPurpose()
        );
        
        log.info("Booking created successfully with ID: {}", booking.getId());
        
        return toDto(booking);
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<BookingResponseDto> availableBookings() {
        log.info("Fetching all available (pending) bookings");
        return bookingService.listByStatus(BookingStatus.PENDING)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<BookingResponseDto> myBookings(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }
        
        return bookingService.listByUser(principal.getUserId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<BookingResponseDto> all(@RequestParam(required = false) BookingStatus status) {
        List<Booking> bookings = status == null ? bookingService.listAll() : bookingService.listByStatus(status);
        return bookings.stream().map(this::toDto).toList();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public BookingResponseDto updateStatus(@PathVariable Long id,
                                             @Valid @RequestBody BookingDecisionDto decision) {
        Booking updated = decision.isApproved()
                ? bookingService.approveBooking(id, decision.getReason())
                : bookingService.rejectBooking(id, decision.getReason());
        return toDto(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public void cancel(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }
        bookingService.cancelBooking(id, principal.getUserId());
    }

    @GetMapping("/debug/me")
    public String debugMe(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return "❌ No authenticated user found! Please login first.";
        }
        return String.format("✅ Authenticated user:\nID: %d\nEmail: %s\nName: %s\nRole: %s", 
                principal.getUserId(), 
                principal.getEmail(), 
                principal.getName(), 
                principal.getRole());
    }

    private BookingResponseDto toDto(Booking b) {
        BookingResponseDto dto = new BookingResponseDto();
        dto.setId(b.getId());
        dto.setResourceId(b.getResourceId());
        dto.setRequestedByUserId(b.getRequestedByUserId());
        dto.setBookingDate(b.getBookingDate());
        dto.setStartTime(b.getStartTime());
        dto.setEndTime(b.getEndTime());
        dto.setPurpose(b.getPurpose());
        dto.setStatus(b.getStatus());
        dto.setAdminDecisionReason(b.getAdminDecisionReason());
        dto.setCreatedAt(b.getCreatedAt());
        dto.setUpdatedAt(b.getUpdatedAt());
        return dto;
    }
}