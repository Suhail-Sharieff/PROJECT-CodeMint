import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kErrorColor = Color(0xFFF85149);
const kWarningColor = Color(0xFFF8D75A);
const kSecondaryTextColor = Color(0xFF8B949E);

// Enum remains the same
enum ToastType { SUCCESS, ERROR, WARNING }

/// The main function to call to show our custom toast
void showToast(BuildContext context, String message, ToastType type) {
  // Get the OverlayState
  final overlay = Overlay.of(context);
  late OverlayEntry overlayEntry;

  // Create the OverlayEntry
  overlayEntry = OverlayEntry(
    builder: (context) => Positioned(
      bottom: 50.0,
      left: 20,
      right: 20,
      child: CustomToastWidget(
        message: message,
        type: type,
        // Pass a function to remove the toast
        onClose: () {
          overlayEntry.remove();
        },
      ),
    ),
  );

  // Insert the toast into the overlay
  overlay.insert(overlayEntry);
}


/// The actual UI for the toast notification
class CustomToastWidget extends StatefulWidget {
  final String message;
  final ToastType type;
  final VoidCallback onClose;

  const CustomToastWidget({
    Key? key,
    required this.message,
    required this.type,
    required this.onClose,
  }) : super(key: key);

  @override
  State<CustomToastWidget> createState() => _CustomToastWidgetState();
}

class _CustomToastWidgetState extends State<CustomToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    // Setup animation controller
    _controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    // Setup animations
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0.0, 1.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));

    // Start the animation
    _controller.forward();

    // Auto-close the toast after a delay
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _controller.reverse().then((_) => widget.onClose());
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (widget.type) {
      case ToastType.SUCCESS:
        icon = Icons.check_circle_rounded;
        color = kPrimaryColor;
        break;
      case ToastType.ERROR:
        icon = Icons.error_rounded;
        color = kErrorColor;
        break;
      case ToastType.WARNING:
        icon = Icons.warning_rounded;
        color = kWarningColor;
        break;
    }

    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _offsetAnimation,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: kCardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withOpacity(0.5)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Row(
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.message,
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 15,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


// --- HOW TO USE IT ---
// showCustomToast(context, "Profile updated!", ToastType.SUCCESS);
// showCustomToast(context, "Could not connect to server.", ToastType.ERROR);