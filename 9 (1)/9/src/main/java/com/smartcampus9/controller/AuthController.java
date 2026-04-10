package com.smartcampus9.controller;

import com.smartcampus9.auth.model.UserAccount;
import com.smartcampus9.auth.model.UserRole;
import com.smartcampus9.auth.repository.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserAccountRepository userAccountRepository;

    public AuthController(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();

        if (principal == null) {
            response.put("authenticated", false);
            return response;
        }

        String email = principal.getAttribute("email");

        // Always fetch fresh role and user info from DB to avoid stale session data
        UserAccount user = userAccountRepository.findByEmail(email).orElse(null);
        if (user == null) {
            response.put("authenticated", false);
            return response;
        }

        response.put("authenticated", true);
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("userId", user.getId());
        response.put("role", user.getRole().name()); // Always from DB

        return response;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> getAllUsers(@AuthenticationPrincipal OAuth2User principal) {
        // Check if current user is admin
        if (principal == null) {
            throw new RuntimeException("Not authenticated");
        }

        String email = principal.getAttribute("email");
        UserAccount currentUser = userAccountRepository.findByEmail(email).orElse(null);
        if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Access denied: Admin role required");
        }

        // Get all users
        List<UserAccount> users = userAccountRepository.findAll();

        return users.stream().map(user -> {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("email", user.getEmail());
            userMap.put("name", user.getName());
            userMap.put("role", user.getRole().name());
            userMap.put("createdAt", user.getCreatedAt());
            return userMap;
        }).collect(Collectors.toList());
    }

    @PostMapping("/users")
    public Map<String, Object> createTechnician(@AuthenticationPrincipal OAuth2User principal,
                                                @Valid @RequestBody CreateTechnicianDto dto) {
        if (principal == null) {
            throw new RuntimeException("Not authenticated");
        }

        String email = principal.getAttribute("email");
        UserAccount currentUser = userAccountRepository.findByEmail(email).orElse(null);
        if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Access denied: Admin role required");
        }

        if (userAccountRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("A user with that email already exists.");
        }

        UserAccount technician = new UserAccount(
                "manual:" + dto.getEmail(),
                dto.getEmail(),
                dto.getName() != null && !dto.getName().isBlank() ? dto.getName() : dto.getEmail().split("@")[0],
                UserRole.TECHNICIAN
        );
        userAccountRepository.save(technician);

        Map<String, Object> response = new HashMap<>();
        response.put("id", technician.getId());
        response.put("email", technician.getEmail());
        response.put("name", technician.getName());
        response.put("role", technician.getRole().name());
        response.put("createdAt", technician.getCreatedAt());
        return response;
    }

    public static class CreateTechnicianDto {
        @NotBlank
        @Email
        private String email;

        private String name;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}