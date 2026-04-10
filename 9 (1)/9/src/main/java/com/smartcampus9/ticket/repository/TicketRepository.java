package com.smartcampus9.ticket.repository;

import com.smartcampus9.ticket.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByCreatedByUserIdOrAssignedToUserIdOrderByCreatedAtDesc(Long createdByUserId, Long assignedToUserId);
}

