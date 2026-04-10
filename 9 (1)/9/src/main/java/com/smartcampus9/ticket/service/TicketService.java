package com.smartcampus9.ticket.service;

import com.smartcampus9.common.exception.BadRequestException;
import com.smartcampus9.common.exception.ForbiddenException;
import com.smartcampus9.common.exception.NotFoundException;
import com.smartcampus9.notification.model.NotificationType;
import com.smartcampus9.notification.service.NotificationService;
import com.smartcampus9.resource.service.ResourceService;
import com.smartcampus9.ticket.model.*;
import com.smartcampus9.ticket.repository.TicketAttachmentRepository;
import com.smartcampus9.ticket.repository.TicketCommentRepository;
import com.smartcampus9.ticket.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketCommentRepository commentRepository;
    private final ResourceService resourceService;
    private final NotificationService notificationService;

    private final Path uploadRoot;

    public TicketService(TicketRepository ticketRepository,
                         TicketAttachmentRepository attachmentRepository,
                         TicketCommentRepository commentRepository,
                         ResourceService resourceService,
                         NotificationService notificationService,
                         @Value("${app.uploads.root:uploads}") String uploadRoot) {
        this.ticketRepository = ticketRepository;
        this.attachmentRepository = attachmentRepository;
        this.commentRepository = commentRepository;
        this.resourceService = resourceService;
        this.notificationService = notificationService;
        this.uploadRoot = Path.of(uploadRoot);
    }

    public Ticket create(Long createdByUserId,
                         Long resourceId,
                         String location,
                         TicketCategory category,
                         TicketPriority priority,
                         String description,
                         String preferredContact,
                         List<MultipartFile> images) {

        if (createdByUserId == null || createdByUserId <= 0) {
            throw new BadRequestException("Invalid createdByUserId.");
        }
        String loc = normalize(location);
        if (resourceId == null && loc == null) {
            throw new BadRequestException("Either resourceId or location is required.");
        }
        if (resourceId != null && resourceId <= 0) {
            throw new BadRequestException("resourceId must be a positive number.");
        }
        if (resourceId != null) {
            resourceService.getById(resourceId);
        }
        if (loc == null) {
            // fallback: store resource location later; for now store placeholder
            loc = "RESOURCE#" + resourceId;
        }
        if (category == null) {
            throw new BadRequestException("category is required.");
        }
        if (priority == null) {
            throw new BadRequestException("priority is required.");
        }
        String desc = normalize(description);
        if (desc == null) {
            throw new BadRequestException("description is required.");
        }
        String contact = normalize(preferredContact);
        if (contact == null) {
            throw new BadRequestException("preferredContact is required.");
        }
        if (images != null && images.size() > 3) {
            throw new BadRequestException("Up to 3 image attachments are allowed.");
        }

        Ticket ticket = ticketRepository.save(new Ticket(resourceId, loc, category, priority, desc, contact, createdByUserId));

        if (images != null && !images.isEmpty()) {
            for (MultipartFile f : images) {
                if (f == null || f.isEmpty()) {
                    continue;
                }
                storeAttachment(ticket.getId(), f);
            }
        }

        // Notify the ticket creator
        notificationService.create(createdByUserId, NotificationType.TICKET_STATUS_CHANGED,
                "Ticket #" + ticket.getId() + " created (OPEN).", ticket.getId());
        
        // Notify admins about the new ticket
        notificationService.createForAdminsOnly(NotificationType.TICKET_STATUS_CHANGED,
                "New ticket #" + ticket.getId() + " created and requires attention.", ticket.getId());

        return ticket;
    }

    @Transactional(readOnly = true)
    public Ticket getById(Long ticketId) {
        return getOrThrow(ticketId);
    }

    @Transactional(readOnly = true)
    public List<Ticket> listAll() {
        return ticketRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Ticket> listMine(Long userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("Invalid userId.");
        }
        return ticketRepository.findByCreatedByUserIdOrAssignedToUserIdOrderByCreatedAtDesc(userId, userId);
    }

    public Ticket updateStatus(Long ticketId,
                               TicketStatus status,
                               Long assignedToUserId,
                               String rejectionReason,
                               String resolutionNotes) {
        Ticket t = getOrThrow(ticketId);
        if (status == null) {
            throw new BadRequestException("status is required.");
        }

        if (assignedToUserId != null && assignedToUserId <= 0) {
            throw new BadRequestException("assignedToUserId must be a positive number.");
        }

        switch (status) {
            case REJECTED -> {
                String rr = normalize(rejectionReason);
                if (rr == null) {
                    throw new BadRequestException("rejectionReason is required when rejecting a ticket.");
                }
                t.setRejectionReason(rr);
                t.setResolutionNotes(null);
            }
            case RESOLVED, CLOSED -> {
                String rn = normalize(resolutionNotes);
                if (rn == null) {
                    throw new BadRequestException("resolutionNotes is required when resolving/closing a ticket.");
                }
                t.setResolutionNotes(rn);
                t.setRejectionReason(null);
            }
            default -> {
                t.setRejectionReason(null);
                // keep existing resolution notes unless overridden
                if (normalize(resolutionNotes) != null) {
                    t.setResolutionNotes(normalize(resolutionNotes));
                }
            }
        }

        if (assignedToUserId != null) {
            t.setAssignedToUserId(assignedToUserId);
        }
        t.setStatus(status);
        Ticket saved = ticketRepository.save(t);

        notificationService.create(saved.getCreatedByUserId(),
                NotificationType.TICKET_STATUS_CHANGED,
                "Ticket #" + saved.getId() + " status changed to " + saved.getStatus() + ".",
                saved.getId());
        
        // Also notify admins about the status change
        notificationService.createForAdminsOnly(NotificationType.TICKET_STATUS_CHANGED,
                "Ticket #" + saved.getId() + " status changed to " + saved.getStatus() + ".",
                saved.getId());

        // Notify technician if assigned to them
        if (assignedToUserId != null && !assignedToUserId.equals(t.getCreatedByUserId())) {
            notificationService.create(assignedToUserId,
                    NotificationType.TICKET_STATUS_CHANGED,
                    "Ticket #" + saved.getId() + " assigned to you: " + saved.getDescription(),
                    saved.getId());
        }

        return saved;
    }

    public TicketComment addComment(Long ticketId, Long authorUserId, String body) {
        Ticket t = getOrThrow(ticketId);
        if (authorUserId == null || authorUserId <= 0) {
            throw new BadRequestException("Invalid authorUserId.");
        }
        String b = normalize(body);
        if (b == null) {
            throw new BadRequestException("Comment body is required.");
        }
        TicketComment c = commentRepository.save(new TicketComment(t.getId(), authorUserId, b));

        if (!authorUserId.equals(t.getCreatedByUserId())) {
            notificationService.create(t.getCreatedByUserId(),
                    NotificationType.TICKET_COMMENT_ADDED,
                    "New comment on Ticket #" + t.getId() + ".",
                    t.getId());
        }
        
        // Notify admins about the new comment
        notificationService.createForAdminsOnly(NotificationType.TICKET_COMMENT_ADDED,
                "New comment added to Ticket #" + t.getId() + ".",
                t.getId());

        // Notify assigned technician about the new comment
        if (t.getAssignedToUserId() != null && !authorUserId.equals(t.getAssignedToUserId())) {
            notificationService.create(t.getAssignedToUserId(),
                    NotificationType.TICKET_COMMENT_ADDED,
                    "New comment on Ticket #" + t.getId() + ".",
                    t.getId());
        }

        return c;
    }

    public TicketComment updateComment(Long ticketId, Long commentId, Long authorUserId, String body) {
        getOrThrow(ticketId);
        TicketComment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found."));
        if (!c.getTicketId().equals(ticketId)) {
            throw new BadRequestException("Comment does not belong to this ticket.");
        }
        if (!c.getAuthorUserId().equals(authorUserId)) {
            throw new ForbiddenException("You can only edit your own comments.");
        }
        String b = normalize(body);
        if (b == null) {
            throw new BadRequestException("Comment body is required.");
        }
        c.setBody(b);
        return commentRepository.save(c);
    }

    public void deleteComment(Long ticketId, Long commentId, Long requesterUserId, boolean requesterIsAdmin) {
        getOrThrow(ticketId);
        TicketComment c = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment not found."));
        if (!c.getTicketId().equals(ticketId)) {
            throw new BadRequestException("Comment does not belong to this ticket.");
        }
        if (!requesterIsAdmin && !c.getAuthorUserId().equals(requesterUserId)) {
            throw new ForbiddenException("You can only delete your own comments.");
        }
        commentRepository.delete(c);
    }

    @Transactional(readOnly = true)
    public List<TicketAttachment> listAttachments(Long ticketId) {
        getOrThrow(ticketId);
        return attachmentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional(readOnly = true)
    public List<TicketComment> listComments(Long ticketId) {
        getOrThrow(ticketId);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional(readOnly = true)
    public TicketAttachment getAttachment(Long ticketId, Long attachmentId) {
        getOrThrow(ticketId);
        TicketAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NotFoundException("Attachment not found."));
        if (!a.getTicketId().equals(ticketId)) {
            throw new BadRequestException("Attachment does not belong to this ticket.");
        }
        return a;
    }

    public Path getAttachmentPath(TicketAttachment attachment) {
        return uploadRoot.resolve("tickets").resolve(String.valueOf(attachment.getTicketId())).resolve(attachment.getStoredFileName());
    }

    private void storeAttachment(Long ticketId, MultipartFile file) {
        String contentType = normalize(file.getContentType());
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image attachments are allowed.");
        }
        if (file.getSize() > 2_500_000) {
            throw new BadRequestException("Each image must be 2.5MB or smaller.");
        }
        long existingCount = attachmentRepository.countByTicketId(ticketId);
        if (existingCount >= 3) {
            throw new BadRequestException("Up to 3 image attachments are allowed.");
        }

        String originalName = normalize(file.getOriginalFilename());
        if (originalName == null) {
            originalName = "image";
        }

        String ext = guessExtension(contentType, originalName);
        String stored = UUID.randomUUID() + ext;

        Path dir = uploadRoot.resolve("tickets").resolve(String.valueOf(ticketId));
        try {
            Files.createDirectories(dir);
            Path dest = dir.resolve(stored).normalize();
            if (!dest.startsWith(dir.normalize())) {
                throw new BadRequestException("Invalid file path.");
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BadRequestException("Failed to store attachment.");
        }

        attachmentRepository.save(new TicketAttachment(ticketId, originalName, stored, contentType, file.getSize()));
    }

    private Ticket getOrThrow(Long ticketId) {
        if (ticketId == null || ticketId <= 0) {
            throw new BadRequestException("Invalid ticket id.");
        }
        return ticketRepository.findById(ticketId).orElseThrow(() -> new NotFoundException("Ticket not found."));
    }

    private String normalize(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private String guessExtension(String contentType, String originalName) {
        String lower = originalName == null ? "" : originalName.toLowerCase();
        if (lower.endsWith(".png")) return ".png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ".jpg";
        if (lower.endsWith(".webp")) return ".webp";
        if (lower.endsWith(".gif")) return ".gif";
        if (contentType.equals("image/png")) return ".png";
        if (contentType.equals("image/jpeg")) return ".jpg";
        if (contentType.equals("image/webp")) return ".webp";
        if (contentType.equals("image/gif")) return ".gif";
        return "";
    }
}

