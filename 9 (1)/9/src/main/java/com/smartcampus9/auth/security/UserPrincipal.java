package com.smartcampus9.auth.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public class UserPrincipal implements OAuth2User, UserDetails {
    
    private Long userId;
    private String email;
    private String name;
    private String role;
    private Map<String, Object> attributes;
    
    public UserPrincipal(Long userId, String email, String name, String role) {
        this.userId = userId;
        this.email = email;
        this.name = name;
        this.role = role;
    }
    
    public static UserPrincipal create(Long userId, String email, String name, String role) {
        return new UserPrincipal(userId, email, name, role);
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public String getEmail() {
        return email;
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    public String getRole() {
        return role;
    }
    
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }
    
    public void setAttributes(Map<String, Object> attributes) {
        this.attributes = attributes;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
    
    @Override
    public String getPassword() {
        return null;
    }
    
    @Override
    public String getUsername() {
        return email;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return true;
    }
    
    @Override
    public String toString() {
        return "UserPrincipal{" +
                "userId=" + userId +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", role='" + role + '\'' +
                '}';
    }
}