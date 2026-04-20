package com.smartcampus9.auth.repository;

import com.smartcampus9.auth.model.UserAccount;
import com.smartcampus9.auth.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);
    Optional<UserAccount> findByGoogleSub(String googleSub);
    boolean existsByEmail(String email);
    List<UserAccount> findByRole(UserRole role);
}