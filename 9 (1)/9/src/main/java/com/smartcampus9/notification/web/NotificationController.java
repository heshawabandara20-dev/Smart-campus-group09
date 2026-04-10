package com.smartcampus9.notification.web;

import com.smartcampus9.auth.security.UserPrincipal;
import com.smartcampus9.notification.dto.NotificationResponseDto;
import com.smartcampus9.notification.model.Notification;
import com.smartcampus9.notification.service.NotificationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER','TECHNICIAN','ADMIN')")
    public List<NotificationResponseDto> my(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.myNotifications(principal.getUserId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/my/unread")
    @PreAuthorize("hasAnyRole('USER','TECHNICIAN','ADMIN')")
    public List<NotificationResponseDto> myUnread(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.myUnreadNotifications(principal.getUserId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/my/unread-count")
    @PreAuthorize("hasAnyRole('USER','TECHNICIAN','ADMIN')")
    public UnreadCountDto getUnreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return new UnreadCountDto(notificationService.getUnreadCount(principal.getUserId()));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('USER','TECHNICIAN','ADMIN')")
    public NotificationResponseDto markRead(@PathVariable Long id,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        Notification updated = notificationService.markRead(id, principal.getUserId());
        return toDto(updated);
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAnyRole('USER','TECHNICIAN','ADMIN')")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllRead(principal.getUserId());
    }

    private NotificationResponseDto toDto(Notification n) {
        NotificationResponseDto dto = new NotificationResponseDto();
        dto.setId(n.getId());
        dto.setType(n.getType());
        dto.setMessage(n.getMessage());
        dto.setRelatedTicketId(n.getRelatedTicketId());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setReadAt(n.getReadAt());
        return dto;
    }

    public static class UnreadCountDto {
        private long unreadCount;

        public UnreadCountDto(long unreadCount) {
            this.unreadCount = unreadCount;
        }

        public long getUnreadCount() {
            return unreadCount;
        }

        public void setUnreadCount(long unreadCount) {
            this.unreadCount = unreadCount;
        }
    }
}

