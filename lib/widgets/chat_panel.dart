import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// --- (You can move these to a central constants file) ---
const kBackgroundColor = Color(0xFF0D1117);
const kCardColor = Color(0xFF161B22);
const kPrimaryColor = Color(0xFF23D997);
const kSecondaryTextColor = Color(0xFF8B949E);
const kInputBorderColor = Color(0xFF30363D);

class ChatPanel extends StatefulWidget {
  final List<Map<String, dynamic>> messages;
  final void Function(String message) onSend;
  // Add this to distinguish the current user's messages
  final String currentUserName;

  const ChatPanel({
    super.key,
    required this.messages,
    required this.onSend,
    required this.currentUserName,
  });

  @override
  State<ChatPanel> createState() => _ChatPanelState();
}

class _ChatPanelState extends State<ChatPanel> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void didUpdateWidget(covariant ChatPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Scroll to the bottom when a new message arrives
    if (widget.messages.length > oldWidget.messages.length) {
      // Use a post-frame callback to ensure the list has been built
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            0.0,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            reverse: true, // Shows messages from bottom to top
            padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
            itemCount: widget.messages.length,
            itemBuilder: (context, index) {
              // Access messages in reverse order because of the 'reverse' property
              final msg = widget.messages[widget.messages.length - 1 - index];
              final bool isMe = msg['userName'] == widget.currentUserName;
              return _buildMessageBubble(msg, isMe);
            },
          ),
        ),
        _buildMessageInputBar(),
      ],
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    final name = msg['userName'] ?? 'User';
    final role = msg['role'] ?? 'student';
    final text = msg['message'] ?? '';

    final bubbleAlignment = isMe ? Alignment.centerRight : Alignment.centerLeft;
    final bubbleColor = isMe ? kPrimaryColor : kCardColor;
    final textColor = isMe ? kBackgroundColor : Colors.white;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: Align(
        alignment: bubbleAlignment,
        child: Container(
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.6),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: bubbleColor,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
              bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
            ),
          ),
          child: Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Text(
                isMe ? 'You ($role)' : '$name ($role)',
                style: GoogleFonts.poppins(
                  color: isMe ? textColor.withOpacity(0.8) : kSecondaryTextColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                text,
                style: GoogleFonts.poppins(
                  color: textColor,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessageInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
      color: kCardColor.withOpacity(0.5), // A slightly different color for the input bar
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              style: GoogleFonts.poppins(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle: GoogleFonts.poppins(color: kSecondaryTextColor),
                filled: true,
                fillColor: kBackgroundColor,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30.0),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: kPrimaryColor,
            borderRadius: BorderRadius.circular(30),
            child: InkWell(
              borderRadius: BorderRadius.circular(30),
              onTap: _sendMessage,
              child: const Padding(
                padding: EdgeInsets.all(12.0),
                child: Icon(
                  Icons.send_rounded,
                  color: kBackgroundColor,
                  size: 24,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    if (_textController.text.trim().isEmpty) return;
    widget.onSend(_textController.text.trim());
    _textController.clear();
    // Keep focus on the text field after sending
    FocusScope.of(context).unfocus();
  }
}