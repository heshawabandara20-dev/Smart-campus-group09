package com.smartcampus9.auth.service;

import com.smartcampus9.auth.model.UserAccount;
import com.smartcampus9.auth.model.UserRole;
import com.smartcampus9.auth.repository.UserAccountRepository;
import com.smartcampus9.auth.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    
    private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);
    
    @Value("${app.admin.emails:heshawabandara20@gmail.com}")
    private String adminEmails;
    
    private final UserAccountRepository userAccountRepository;
    
    public CustomOAuth2UserService(UserAccountRepository userAccountRepository) {
        super();
        this.userAccountRepository = userAccountRepository;
    }
    
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleSub = oAuth2User.getAttribute("sub");
        
        log.info("Loading user with email: {}", email);
        
        if (email == null) {
            log.error("Email is null from OAuth2User");
            throw new OAuth2AuthenticationException("Email not found from OAuth2 provider");
        }
        
        // Determine role based on email
        UserRole role = UserRole.USER;
        List<String> adminEmailList = Arrays.asList(adminEmails.split(","));
        if (adminEmailList.contains(email)) {
            role = UserRole.ADMIN;
            log.info("User {} is an ADMIN", email);
        }
        
        // Make role final for use in lambda
        final UserRole finalRole = role;
        
        // Find or create user account
        UserAccount userAccount = userAccountRepository.findByEmail(email)
                .orElseGet(() -> {
                    log.info("Creating new user account with email: {}", email);
                    UserAccount newUser = new UserAccount(
                            googleSub,
                            email,
                            name != null ? name : email.split("@")[0],
                            finalRole
                    );
                    return userAccountRepository.save(newUser);
                });
        
        // Update googleSub if not set
        if (userAccount.getGoogleSub() == null && googleSub != null) {
            userAccount.setGoogleSub(googleSub);
            userAccount = userAccountRepository.save(userAccount);
        }
        
        // Update name if changed
        if (name != null && !name.equals(userAccount.getName())) {
            userAccount.setName(name);
            userAccount = userAccountRepository.save(userAccount);
        }
        
        // Create UserPrincipal
        UserPrincipal userPrincipal = UserPrincipal.create(
                userAccount.getId(),
                userAccount.getEmail(),
                userAccount.getName(),
                userAccount.getRole().toString()
        );
        
        // Copy attributes from OAuth2User
        userPrincipal.setAttributes(oAuth2User.getAttributes());
        
        log.info("UserPrincipal created with ID: {} and role: {}", userAccount.getId(), userAccount.getRole());
        
        return userPrincipal;
    }
}