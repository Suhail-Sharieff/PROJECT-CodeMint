import 'package:flutter/material.dart';

class ParticipantsList extends StatelessWidget {
  final List<Map<String, dynamic>> participants;

  const ParticipantsList({super.key, required this.participants});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: participants.length,
      itemBuilder: (context, index) {
        final p = participants[index];
        return ListTile(
          leading: Icon(p['role'] == 'teacher' ? Icons.school : Icons.person),
          title: Text(p['name'] ?? 'User'),
          subtitle: Text('Role: ${p['role']}'),
        );
      },
    );
  }
}