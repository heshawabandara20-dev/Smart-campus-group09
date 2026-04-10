package com.smartcampus9.ticket.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ticket_comments",
        indexes = {
                @Index(name = "idx_ticket_comments_ticket", columnList = "ticket_id"),
                @Index(name = "idx_ticket_comments_author", columnList = "author_user_id")
        }
)
public class TicketComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Positive
    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @NotNull
    @Positive
    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @NotBlank
    @Column(name = "body", nullable = false, length = 2000)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TicketComment() {
        // for JPA
    }

    public TicketComment(Long ticketId, Long authorUserId, String body) {
        this.ticketId = ticketId;
        this.authorUserId = authorUserId;
        this.body = body;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public Long getAuthorUserId() {
        return authorUserId;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}

