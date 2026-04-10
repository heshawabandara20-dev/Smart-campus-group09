package com.smartcampus9.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.List;

@Component
public class AdminConfig {
    
    @Value("${app.admin.emails:}")
    private String adminEmailsString;
    
    private List<String> adminEmails;
    
    @PostConstruct
    public void init() {
        if (adminEmailsString != null && !adminEmailsString.isEmpty()) {
            adminEmails = Arrays.asList(adminEmailsString.split(","));
            System.out.println("========== ADMIN CONFIG LOADED ==========");
            System.out.println("Admin emails: " + adminEmails);
            System.out.println("=========================================");
        } else {
            System.out.println("WARNING: No admin emails configured!");
        }
    }
    
    public boolean isAdminEmail(String email) {
        boolean isAdmin = adminEmails != null && adminEmails.contains(email);
        if (isAdmin) {
            System.out.println("✅ Admin login detected: " + email);
        }
        return isAdmin;
    }
    
    public List<String> getAdminEmails() {
        return adminEmails;
    }
}