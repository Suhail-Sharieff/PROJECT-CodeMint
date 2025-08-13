import 'package:flutter/material.dart';

class ChatPanel extends StatefulWidget {
  final List<Map<String, dynamic>> messages;
  final void Function(String message) onSend;

  const ChatPanel({super.key, required this.messages, required this.onSend});

  @override
  State<ChatPanel> createState() => _ChatPanelState();
}

class _ChatPanelState extends State<ChatPanel> {
  final _ctrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            reverse: true,
            itemCount: widget.messages.length,
            itemBuilder: (context, index) {
              final msg = widget.messages[widget.messages.length - 1 - index];
              final name = msg['userName'] ?? 'User';
              final role = msg['role'] ?? '';
              final text = msg['message'] ?? '';
              return ListTile(
                dense: true,
                title: Text(text),
                subtitle: Text("\$name (\$role)"),
              );
            },
          ),
        ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                decoration: const InputDecoration(hintText: 'Type a message'),
                onSubmitted: (_) => _send(),
              ),
            ),
            IconButton(icon: const Icon(Icons.send), onPressed: _send),
          ],
        )
      ],
    );
  }

  void _send() {
    if (_ctrl.text.trim().isEmpty) return;
    widget.onSend(_ctrl.text.trim());
    _ctrl.clear();
  }
}