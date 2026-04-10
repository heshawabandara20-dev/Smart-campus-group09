package com.smartcampus9.booking.dto;

import jakarta.validation.constraints.NotNull;

public class BookingDecisionDto {

    @NotNull
    private Boolean approved;

    private String reason;

    public boolean isApproved() {
        return approved != null && approved;
    }

    public void setApproved(Boolean approved) {
        this.approved = approved;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

