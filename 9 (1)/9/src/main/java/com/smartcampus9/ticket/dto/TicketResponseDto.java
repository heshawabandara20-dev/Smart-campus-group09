package com.smartcampus9.ticket.dto;

import com.smartcampus9.ticket.model.TicketCategory;
import com.smartcampus9.ticket.model.TicketPriority;
import com.smartcampus9.ticket.model.TicketStatus;

import java.time.LocalDateTime;
import java.util.List;

public class TicketResponseDto {
    private Long id;
    private Long resourceId;
    private String location;
    private TicketCategory category;
    private TicketPriority priority;
    private String description;
    private String preferredContact;
    private Long createdByUserId;
    private Long assignedToUserId;
    private TicketStatus status;
    private String rejectionReason;
    private String resolutionNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketAttachmentResponseDto> attachments;
    private List<TicketCommentResponseDto> comments;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getResourceId() {
        return resourceId;
    }

    public void setResourceId(Long resourceId) {
        this.resourceId = resourceId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public TicketCategory getCategory() {
        return category;
    }

    public void setCategory(TicketCategory category) {
        this.category = category;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public void setPriority(TicketPriority priority) {
        this.priority = priority;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPreferredContact() {
        return preferredContact;
    }

    public void setPreferredContact(String preferredContact) {
        this.preferredContact = preferredContact;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public Long getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(Long assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<TicketAttachmentResponseDto> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<TicketAttachmentResponseDto> attachments) {
        this.attachments = attachments;
    }

    public List<TicketCommentResponseDto> getComments() {
        return comments;
    }

    public void setComments(List<TicketCommentResponseDto> comments) {
        this.comments = comments;
    }
}

