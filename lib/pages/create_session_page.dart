import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Import your other pages and services
import '../constants/routes.dart';
import '../services/api/api_service.dart';
import 'session_page.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kErrorColor = Color(0xFFF85149);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);


class CreateSessionPage extends StatefulWidget {
  static const route_name=create_session_route;
  const CreateSessionPage({super.key});

  @override
  State<CreateSessionPage> createState() => _CreateSessionPageState();
}

class _CreateSessionPageState extends State<CreateSessionPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _createSession() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _error = null; });

    try {
      final res = await ApiService.createSession(_nameCtrl.text.trim());
      final sessionId = res['sessionId'] as String;
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => SessionPage(
            sessionId: sessionId,
            userName: _nameCtrl.text.trim(),
            role: 'teacher',
          ),
        ),
      );
    } catch (e) {
      setState(() { _error = 'Failed to create session. Please try again.'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackgroundColor,
      appBar: AppBar(
        title: Text('Create Session', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
        backgroundColor: kBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: kSecondaryTextColor),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(),
                const SizedBox(height: 40),
                _buildForm(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Icon(Icons.video_call_outlined, color: kPrimaryColor, size: 80),
        const SizedBox(height: 24),
        Text(
          'Start a New Session',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter your name to begin a new collaborative session as the teacher.',
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

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _nameCtrl,
            style: GoogleFonts.poppins(color: Colors.white),
            decoration: _buildInputDecoration(
              labelText: 'Your Name (Teacher)',
              prefixIcon: Icons.person_outline_rounded,
            ),
            validator: (value) => value == null || value.trim().isEmpty ? 'Please enter your name' : null,
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(color: kErrorColor, fontWeight: FontWeight.w500),
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
              disabledBackgroundColor: kPrimaryColor.withOpacity(0.5),
            ),
            onPressed: _isLoading ? null : _createSession,
            child: _isLoading
                ? const SizedBox(
              height: 24,
              width: 24,
              child: CircularProgressIndicator(
                color: kBackgroundColor,
                strokeWidth: 3,
              ),
            )
                : Text(
              'Create & Enter Session',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Reusable Input Decoration Helper
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
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kErrorColor, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kErrorColor, width: 2),
      ),
    );
  }
}