package com.smartcampus9.ticket.web;

import com.smartcampus9.auth.model.UserRole;
import com.smartcampus9.auth.security.UserPrincipal;
import com.smartcampus9.ticket.dto.*;
import com.smartcampus9.ticket.model.*;
import com.smartcampus9.ticket.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public TicketResponseDto create(@AuthenticationPrincipal UserPrincipal principal,
                                    @RequestParam(required = false) Long resourceId,
                                    @RequestParam(required = false) String location,
                                    @RequestParam TicketCategory category,
                                    @RequestParam TicketPriority priority,
                                    @RequestParam String description,
                                    @RequestParam String preferredContact,
                                    @RequestParam(required = false) List<MultipartFile> images) {

        Ticket created = ticketService.create(
                principal.getUserId(),
                resourceId,
                location,
                category,
                priority,
                description,
                preferredContact,
                images
        );

        return toDto(created, true, true);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public TicketResponseDto getById(@PathVariable Long id,
                                     @AuthenticationPrincipal UserPrincipal principal) {
        Ticket t = ticketService.getById(id);
        boolean isOwner = t.getCreatedByUserId().equals(principal.getUserId());
        boolean isAssigned = t.getAssignedToUserId() != null && t.getAssignedToUserId().equals(principal.getUserId());
        boolean isAdmin = "ADMIN".equals(principal.getRole());
        if (!isOwner && !isAdmin && !isAssigned) {
            // Let GlobalExceptionHandler standardize the error
            throw new com.smartcampus9.common.exception.ForbiddenException("You can only view your own tickets.");
        }
        return toDto(t, true, true);
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public List<TicketResponseDto> my(@AuthenticationPrincipal UserPrincipal principal) {
        return ticketService.listMine(principal.getUserId())
                .stream()
                .map(t -> toDto(t, false, false))
                .toList();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<TicketResponseDto> all() {
        return ticketService.listAll()
                .stream()
                .map(t -> toDto(t, false, false))
                .toList();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    public TicketResponseDto updateStatus(@PathVariable Long id,
                                          @Valid @RequestBody TicketStatusUpdateDto dto) {
        Ticket updated = ticketService.updateStatus(id, dto.getStatus(), dto.getAssignedToUserId(),
                dto.getRejectionReason(), dto.getResolutionNotes());
        return toDto(updated, true, true);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public TicketCommentResponseDto addComment(@PathVariable Long id,
                                               @Valid @RequestBody TicketCommentCreateDto dto,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        TicketComment c = ticketService.addComment(id, principal.getUserId(), dto.getBody());
        return toDto(c);
    }

    @PutMapping("/{ticketId}/comments/{commentId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public TicketCommentResponseDto updateComment(@PathVariable Long ticketId,
                                                  @PathVariable Long commentId,
                                                  @Valid @RequestBody TicketCommentCreateDto dto,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        TicketComment c = ticketService.updateComment(ticketId, commentId, principal.getUserId(), dto.getBody());
        return toDto(c);
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public void deleteComment(@PathVariable Long ticketId,
                              @PathVariable Long commentId,
                              @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = "ADMIN".equals(principal.getRole());
        ticketService.deleteComment(ticketId, commentId, principal.getUserId(), isAdmin);
    }

    @GetMapping("/{ticketId}/attachments/{attachmentId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN','TECHNICIAN')")
    public ResponseEntity<Resource> download(@PathVariable Long ticketId,
                                             @PathVariable Long attachmentId,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        Ticket t = ticketService.getById(ticketId);
        boolean isOwner = t.getCreatedByUserId().equals(principal.getUserId());
        boolean isAssigned = t.getAssignedToUserId() != null && t.getAssignedToUserId().equals(principal.getUserId());
        boolean isAdmin = "ADMIN".equals(principal.getRole());
        if (!isOwner && !isAdmin && !isAssigned) {
            throw new com.smartcampus9.common.exception.ForbiddenException("You can only access your own ticket attachments.");
        }

        TicketAttachment a = ticketService.getAttachment(ticketId, attachmentId);
        Path path = ticketService.getAttachmentPath(a);
        try {
            Resource file = new UrlResource(path.toUri());
            if (!file.exists()) {
                throw new com.smartcampus9.common.exception.NotFoundException("Attachment file not found.");
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(a.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeFileName(a.getOriginalFileName()) + "\"")
                    .body(file);
        } catch (MalformedURLException e) {
            throw new com.smartcampus9.common.exception.BadRequestException("Invalid attachment path.");
        }
    }

    private TicketResponseDto toDto(Ticket t, boolean includeAttachments, boolean includeComments) {
        TicketResponseDto dto = new TicketResponseDto();
        dto.setId(t.getId());
        dto.setResourceId(t.getResourceId());
        dto.setLocation(t.getLocation());
        dto.setCategory(t.getCategory());
        dto.setPriority(t.getPriority());
        dto.setDescription(t.getDescription());
        dto.setPreferredContact(t.getPreferredContact());
        dto.setCreatedByUserId(t.getCreatedByUserId());
        dto.setAssignedToUserId(t.getAssignedToUserId());
        dto.setStatus(t.getStatus());
        dto.setRejectionReason(t.getRejectionReason());
        dto.setResolutionNotes(t.getResolutionNotes());
        dto.setCreatedAt(t.getCreatedAt());
        dto.setUpdatedAt(t.getUpdatedAt());

        if (includeAttachments) {
            dto.setAttachments(ticketService.listAttachments(t.getId()).stream().map(a -> {
                TicketAttachmentResponseDto adto = new TicketAttachmentResponseDto();
                adto.setId(a.getId());
                adto.setOriginalFileName(a.getOriginalFileName());
                adto.setContentType(a.getContentType());
                adto.setSizeBytes(a.getSizeBytes());
                adto.setCreatedAt(a.getCreatedAt());
                adto.setDownloadUrl("/api/tickets/" + t.getId() + "/attachments/" + a.getId());
                return adto;
            }).toList());
        }

        if (includeComments) {
            dto.setComments(ticketService.listComments(t.getId()).stream().map(this::toDto).toList());
        }

        return dto;
    }

    private TicketCommentResponseDto toDto(TicketComment c) {
        TicketCommentResponseDto dto = new TicketCommentResponseDto();
        dto.setId(c.getId());
        dto.setAuthorUserId(c.getAuthorUserId());
        dto.setBody(c.getBody());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        return dto;
    }

    private String safeFileName(String name) {
        if (name == null) return "file";
        return name.replaceAll("[\\r\\n\\\\/\\t\"]", "_");
    }
}

