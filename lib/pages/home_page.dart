import 'package:flutter/material.dart';
import '../pages/create_session_page.dart';
import '../pages/join_session_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Live Coding Classroom')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Welcome!',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Create a session as Teacher or join an existing one as Student.',
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed:
                      () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const CreateSessionPage(),
                        ),
                      ),
                  icon: const Icon(Icons.add_circle),
                  label: const Text('Create Session (Teacher)'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed:
                      () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const JoinSessionPage(),
                        ),
                      ),
                  icon: const Icon(Icons.group),
                  label: const Text('Join Session (Student/Teacher)'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
