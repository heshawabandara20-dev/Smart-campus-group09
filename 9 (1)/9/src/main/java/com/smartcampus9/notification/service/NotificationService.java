package com.smartcampus9.notification.service;

import com.smartcampus9.auth.model.UserAccount;
import com.smartcampus9.auth.model.UserRole;
import com.smartcampus9.auth.repository.UserAccountRepository;
import com.smartcampus9.common.exception.BadRequestException;
import com.smartcampus9.common.exception.ForbiddenException;
import com.smartcampus9.common.exception.NotFoundException;
import com.smartcampus9.notification.model.Notification;
import com.smartcampus9.notification.model.NotificationType;
import com.smartcampus9.notification.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserAccountRepository userAccountRepository;

    public NotificationService(NotificationRepository notificationRepository, UserAccountRepository userAccountRepository) {
        this.notificationRepository = notificationRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public Notification create(Long userId, NotificationType type, String message, Long relatedTicketId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        if (type == null) {
            throw new BadRequestException("Notification type is required.");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new BadRequestException("Notification message is required.");
        }
        return notificationRepository.save(new Notification(userId, type, message.trim(), relatedTicketId));
    }

    public void createForUserAndAdmins(Long userId, NotificationType type, String message, Long relatedTicketId) {
        // Send notification to the specific user
        create(userId, type, message, relatedTicketId);
        
        // Send notification to all admins
        List<UserAccount> admins = userAccountRepository.findByRole(UserRole.ADMIN);
        for (UserAccount admin : admins) {
            create(admin.getId(), type, message, relatedTicketId);
        }
    }

    public void createForAdminsOnly(NotificationType type, String message, Long relatedTicketId) {
        // Send notification to all admins only
        List<UserAccount> admins = userAccountRepository.findByRole(UserRole.ADMIN);
        for (UserAccount admin : admins) {
            create(admin.getId(), type, message, relatedTicketId);
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> myNotifications(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Notification> myUnreadNotifications(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        return notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    public void markAllRead(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(n -> n.getReadAt() == null).toList();
        unread.forEach(n -> { n.markRead(); notificationRepository.save(n); });
    }

    public Notification markRead(Long notificationId, Long userId) {
        Notification n = getOrThrow(notificationId);
        if (!n.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only read your own notifications.");
        }
        n.markRead();
        return notificationRepository.save(n);
    }

    private Notification getOrThrow(Long id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("Invalid notification id.");
        }
        return notificationRepository.findById(id).orElseThrow(() -> new NotFoundException("Notification not found."));
    }
}

