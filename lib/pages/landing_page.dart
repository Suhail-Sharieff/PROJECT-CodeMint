import 'dart:ui';
import 'package:code_mint_frontend/constants/routes.dart';
import 'package:code_mint_frontend/pages/home_page.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// --- THEME CONSTANTS ---
const kBackgroundColor = Color(0xFF0D1117); // GitHub Dark Background
const kCardColor = Color(0xFF161B22); // GitHub Dark Card
const kPrimaryColor = Color(0xFF23D997); // Mint Green Accent
const kSecondaryTextColor = Color(0xFF8B949E);

const kVerticalSpaceMedium = SizedBox(height: 24);
const kVerticalSpaceLarge = SizedBox(height: 60);

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});
  static const route_name=landing_route;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackgroundColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeroSection(context),
            kVerticalSpaceLarge,
            _buildFeaturesSection(context),
            kVerticalSpaceLarge,
            _buildFooter(context),
          ],
        ),
      ),
    );
  }

  // --- HERO SECTION ---
  Widget _buildHeroSection(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 100, horizontal: 20),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Decorative Blobs
          _buildGlassmorphicBlob(
            top: -100,
            left: -100,
            color: kPrimaryColor.withOpacity(0.2),
          ),
          _buildGlassmorphicBlob(
            bottom: -150,
            right: -150,
            color: Colors.blueAccent.withOpacity(0.2),
          ),

          // Content
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: Column(
                children: [
                  Text(
                    "CodeMint",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 52,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    "Teach and learn coding live, together. Real-time editor, chat, and interactive learning for classrooms and teams.",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      color: kSecondaryTextColor,
                      fontSize: 18,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 40,
                        vertical: 20,
                      ),
                      backgroundColor: kPrimaryColor,
                      foregroundColor: kBackgroundColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () {
                        Navigator.of(context).pushNamed(HomePage.route_name);
                    },
                    child: Text(
                      "Get Started Free",
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Helper for decorative shapes in the hero section
  Widget _buildGlassmorphicBlob({
    double? top,
    double? bottom,
    double? left,
    double? right,
    required Color color,
  }) {
    return Positioned(
      top: top,
      bottom: bottom,
      left: left,
      right: right,
      child: Container(
        height: 300,
        width: 300,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.transparent,
            ),
          ),
        ),
      ),
    );
  }

  // --- FEATURES SECTION ---
  Widget _buildFeaturesSection(BuildContext context) {
    final features = [
      {
        "icon": Icons.code_rounded,
        "title": "Real-time Editor",
        "desc": "Code together in C++, Java, and Python instantly.",
      },
      {
        "icon": Icons.people_alt_rounded,
        "title": "Collaborative Learning",
        "desc": "Students and teachers interact in a shared workspace.",
      },
      {
        "icon": Icons.videocam_rounded,
        "title": "Live Video Integration",
        "desc": "Teach coding like in a real classroom with video calls.",
      },
      {
        "icon": Icons.task_alt_rounded,
        "title": "Live Interview",
        "desc": "Conduct real-time coding interviews for candidates.",
      },
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30.0),
      child: Wrap(
        alignment: WrapAlignment.center,
        runSpacing: 24,
        spacing: 24,
        children:
            features
                .map(
                  (f) => FeatureCard(
                    icon: f["icon"] as IconData,
                    title: f["title"] as String,
                    description: f["desc"] as String,
                  ),
                )
                .toList(),
      ),
    );
  }

  // --- FOOTER SECTION ---
  Widget _buildFooter(BuildContext context) {
    return Container(
      width: double.infinity,
      color: kCardColor,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 40),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 600;
          return isWide
              ? Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: _footerContent(isWide: true),
              )
              : Column(children: _footerContent(isWide: false));
        },
      ),
    );
  }

  List<Widget> _footerContent({required bool isWide}) {
    return [
      Text(
        "© 2025 CodeMint. All rights reserved.",
        style: GoogleFonts.poppins(color: kSecondaryTextColor),
      ),
      if (!isWide) const SizedBox(height: 20),
      Wrap(
        alignment: WrapAlignment.center,
        spacing: 24,
        runSpacing: 10,
        children: const [
          _FooterLink(text: "Privacy Policy"),
          _FooterLink(text: "Terms of Service"),
          _FooterLink(text: "Contact Us"),
        ],
      ),
    ];
  }
}

// --- REUSABLE WIDGETS ---

// A dedicated widget for feature cards to handle hover effects
class FeatureCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String description;

  const FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
    super.key,
  });

  @override
  State<FeatureCard> createState() => _FeatureCardState();
}

class _FeatureCardState extends State<FeatureCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: SystemMouseCursors.click,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 300,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: kCardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _isHovered ? kPrimaryColor : Colors.transparent,
            width: 1.5,
          ),
          boxShadow: [
            if (_isHovered)
              BoxShadow(
                color: kPrimaryColor.withOpacity(0.15),
                blurRadius: 16,
                spreadRadius: 4,
              ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: kPrimaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(widget.icon, size: 32, color: kPrimaryColor),
            ),
            kVerticalSpaceMedium,
            Text(
              widget.title,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              widget.description,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: kSecondaryTextColor,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// A simple text link for the footer with a hover effect
class _FooterLink extends StatefulWidget {
  final String text;
  const _FooterLink({required this.text});

  @override
  State<_FooterLink> createState() => _FooterLinkState();
}

class _FooterLinkState extends State<_FooterLink> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: SystemMouseCursors.click,
      child: Text(
        widget.text,
        style: GoogleFonts.poppins(
          color: _isHovered ? kPrimaryColor : Colors.white70,
        ),
      ),
    );
  }
}
