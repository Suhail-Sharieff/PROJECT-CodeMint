import 'package:code_mint_frontend/pages/verify_email_page.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Import your enhanced pages
import '../constants/routes.dart';

// Import pages to navigate to
import 'create_session_page.dart';
import 'join_session_page.dart';
import 'login_page.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);


class HomePage extends StatelessWidget {
  static const route_name = home_route; // Your route name
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    // Use a single StreamBuilder to handle all auth states. This is the recommended approach.
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        // Show a loading indicator while waiting for the auth state
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: kBackgroundColor,
            body: Center(child: CircularProgressIndicator(color: kPrimaryColor)),
          );
        }

        final user = snapshot.data;

        // If user is not logged in, show the login page
        if (user == null) {
          return const LoginPage();
        }

        // If user is logged in but email is not verified, show the verify email page
        if (!user.emailVerified) {
          return const VerifyEmailPage();
        }

        // If user is logged in and verified, show the main home page content
        return _HomePageContent(user: user);
      },
    );
  }
}

// The actual UI for the home page, separated for clarity
class _HomePageContent extends StatelessWidget {
  final User user;
  const _HomePageContent({required this.user});

  @override
  Widget build(BuildContext context) {
    // A fallback name if the user's display name is null
    final String displayName = user.displayName ?? 'Coder';

    return Scaffold(
      backgroundColor: kBackgroundColor,
      appBar: AppBar(
      backgroundColor: kBackgroundColor,
      elevation: 0,
      title: Text(
        'CodeMint',
        style: GoogleFonts.poppins(
          // Add this line to make the text visible
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: kSecondaryTextColor),
        onPressed: () => Navigator.of(context).pop(),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.logout_rounded, color: Colors.white70), // Also good to set icon color explicitly
          tooltip: 'Logout',
          onPressed: () async {
            await FirebaseAuth.instance.signOut();
          },
        ),
        const SizedBox(width: 8),
      ],
    ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, $displayName!',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'What would you like to do today?',
              style: GoogleFonts.poppins(
                color: kSecondaryTextColor,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 40),
            _buildActionCard(
              context: context,
              icon: Icons.add_circle_outline_rounded,
              title: 'Create a Session',
              description: 'Start a new session as a teacher and invite others to collaborate.',
              onTap: () => Navigator.of(context).pushNamed(CreateSessionPage.route_name),
            ),
            const SizedBox(height: 20),
            _buildActionCard(
              context: context,
              icon: Icons.group_add_outlined,
              title: 'Join a Session',
              description: 'Enter a session code provided by your teacher to join an existing session.',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const JoinSessionPage()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // A reusable widget for the main action cards on the dashboard
  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String description,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: kCardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kInputBorderColor, width: 1.5),
        ),
        child: Row(
          children: [
            Icon(icon, color: kPrimaryColor, size: 40),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: GoogleFonts.poppins(
                      color: kSecondaryTextColor,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: kSecondaryTextColor, size: 18),
          ],
        ),
      ),
    );
  }
}