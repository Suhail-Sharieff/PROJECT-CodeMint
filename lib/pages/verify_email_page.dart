import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/routes.dart';
import '../services/auth/auth_methods.dart';
import '../widgets/show_toast.dart';

// Assuming your custom toast and constants are in these files
// import '../widgets/show_toast.dart';
// import '../constants/routes.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);

class VerifyEmailPage extends StatefulWidget {
  static String route_name = verify_email_route; // Your route name
  const VerifyEmailPage({super.key});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  final _emailController = TextEditingController();
  bool _isSubmitted = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSendVerification(BuildContext context) async {
    // Your logic to send the verification link
    await AuthMethods.sendVerifyLink(context: context);
    showToast(context, 'Email sent! Pls login!', ToastType.SUCCESS);
    // For this UI demo, we'll just toggle the state
    if (_emailController.text.isNotEmpty) {
      setState(() {
        _isSubmitted = true;
      });
    } else {
      // Optional: Show an error if the email is empty
      showToast(context, "Please enter your email address.", ToastType.ERROR);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: kSecondaryTextColor,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              transitionBuilder: (child, animation) {
                return FadeTransition(opacity: animation, child: child);
              },
              child: _isSubmitted ? _buildConfirmationView() : _buildFormView(),
            ),
          ),
        ),
      ),
    );
  }

  // --- FORM VIEW WIDGET ---
  Widget _buildFormView() {
    return Column(
      key: const ValueKey('form'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader(
          title: 'You need to verify your email first!',
          subtitle:
              'Enter your email below and we’ll send a verification link to your inbox.',
        ),
        const SizedBox(height: 40),
        TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: GoogleFonts.poppins(color: Colors.white),
          decoration: _buildInputDecoration(
            labelText: 'Email Address',
            prefixIcon: Icons.email_outlined,
          ),
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: kPrimaryColor,
            foregroundColor: kBackgroundColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          onPressed: () async {
            await _handleSendVerification(context);
          },
          child: Text(
            'Send Verification Link',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  // --- CONFIRMATION VIEW WIDGET ---
  Widget _buildConfirmationView() {
    return Column(
      key: const ValueKey('confirmation'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.mark_email_read_outlined, color: kPrimaryColor, size: 80),
        const SizedBox(height: 24),
        _buildHeader(
          title: 'Check Your Inbox!',
          subtitle:
              'We’ve sent a verification link to your email. Please check your inbox and spam and follow the link to continue.',
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: kCardColor,
            foregroundColor: kPrimaryColor,
            shape: RoundedRectangleBorder(
              side: const BorderSide(color: kInputBorderColor),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          onPressed: () {
            // Navigate to the login page
            Navigator.of(context).pushReplacementNamed(login_route);
          },
          child: Text(
            'Back to Login',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  // --- HEADER HELPER WIDGET ---
  Widget _buildHeader({required String title, required String subtitle}) {
    return Column(
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: kSecondaryTextColor,
            fontSize: 16,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  // --- INPUT DECORATION HELPER ---
  InputDecoration _buildInputDecoration({
    required String labelText,
    required IconData prefixIcon,
  }) {
    return InputDecoration(
      labelText: labelText,
      labelStyle: GoogleFonts.poppins(color: kSecondaryTextColor),
      prefixIcon: Icon(prefixIcon, color: kSecondaryTextColor),
      filled: true,
      fillColor: kCardColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kInputBorderColor, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kInputBorderColor, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kPrimaryColor, width: 2),
      ),
    );
  }
}
