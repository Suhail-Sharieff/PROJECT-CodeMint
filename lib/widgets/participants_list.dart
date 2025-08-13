import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// --- (You can move these to a central constants file) ---
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);

class ParticipantsList extends StatelessWidget {
  final List<Map<String, dynamic>> participants;

  const ParticipantsList({super.key, required this.participants});

  @override
  Widget build(BuildContext context) {
    // Show a message if the list is empty
    if (participants.isEmpty) {
      return Center(
        child: Text(
          'Waiting for others to join...',
          style: GoogleFonts.poppins(color: kSecondaryTextColor),
        ),
      );
    }

    return ListView.builder(
      itemCount: participants.length,
      itemBuilder: (context, index) {
        final p = participants[index];
        final bool isTeacher = p['role'] == 'teacher';
        final IconData iconData = isTeacher ? Icons.school_rounded : Icons.person_rounded;
        final Color iconColor = isTeacher ? kPrimaryColor : kSecondaryTextColor;

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
          child: Row(
            children: [
              // Styled Icon
              Icon(iconData, color: iconColor, size: 24),
              const SizedBox(width: 16),
              // Name and Role
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p['name'] ?? 'User',
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    // Capitalize the first letter of the role
                    '${p['role'][0].toUpperCase()}${p['role'].substring(1)}',
                    style: GoogleFonts.poppins(
                      color: kSecondaryTextColor,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}