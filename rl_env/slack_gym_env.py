"""
Slack Clone RL Environment - OpenAI Gym Compatible
===================================================

A reinforcement learning environment that allows agents to learn
to interact with a Slack-like chat application.

Tasks agents can learn:
1. Respond to messages appropriately
2. Manage conversations
3. Prioritize important messages
4. Route messages to appropriate channels
5. Maintain conversation context
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
import requests
import json
from typing import Dict, List, Tuple, Any, Optional
import time
import socket
from socketio import Client as SocketIOClient


class SlackGymEnv(gym.Env):
    """
    OpenAI Gym Environment for Slack Clone
    
    Observation Space:
        - Recent messages (text embeddings)
        - Channel information
        - User presence
        - Unread counts
        - Conversation context
    
    Action Space:
        - Send message
        - React to message
        - Create channel
        - Join channel
        - Send DM
        - Mark as read
        - Pin message
        - Search messages
    
    Reward:
        - Response relevance
        - Timeliness
        - Conversation quality
        - User engagement
    """
    
    metadata = {'render.modes': ['human', 'ansi']}
    
    def __init__(
        self,
        backend_url: str = "http://localhost:3001",
        agent_email: str = "rl_agent@slack.ai",
        agent_password: str = "agent123",
        task: str = "conversation",
        max_steps: int = 100,
        embedding_dim: int = 128
    ):
        super(SlackGymEnv, self).__init__()
        
        self.backend_url = backend_url
        self.agent_email = agent_email
        self.agent_password = agent_password
        self.task = task
        self.max_steps = max_steps
        self.embedding_dim = embedding_dim
        
        # Authentication
        self.session_id = None
        self.user_id = None
        self.workspace_id = None
        self.current_channel_id = None
        
        # Socket.io client for real-time updates
        self.sio_client = None
        self.recent_messages = []
        
        # Step counter
        self.current_step = 0
        
        # Define action space
        # 0: Send message (with text embedding)
        # 1: React to last message
        # 2: Create channel
        # 3: Join channel
        # 4: Send DM
        # 5: Mark as read
        # 6: Pin message
        # 7: Search messages
        # 8: No action (wait)
        self.action_space = spaces.Dict({
            'action_type': spaces.Discrete(9),
            'message_embedding': spaces.Box(
                low=-1, high=1, shape=(self.embedding_dim,), dtype=np.float32
            ),
            'target_id': spaces.Discrete(1000),  # Channel/User ID
            'emoji': spaces.Discrete(20)  # Emoji reactions
        })
        
        # Define observation space
        self.observation_space = spaces.Dict({
            'message_history': spaces.Box(
                low=-1, high=1, 
                shape=(10, self.embedding_dim), 
                dtype=np.float32
            ),
            'channel_info': spaces.Box(
                low=0, high=1, shape=(20,), dtype=np.float32
            ),
            'user_presence': spaces.Box(
                low=0, high=1, shape=(50,), dtype=np.float32
            ),
            'unread_counts': spaces.Box(
                low=0, high=100, shape=(10,), dtype=np.int32
            ),
            'conversation_context': spaces.Box(
                low=-1, high=1, shape=(self.embedding_dim,), dtype=np.float32
            ),
            'time_since_last_message': spaces.Box(
                low=0, high=3600, shape=(1,), dtype=np.float32
            )
        })
        
        # Task-specific configurations
        self.task_configs = {
            'conversation': {
                'reward_weights': {
                    'response_relevance': 0.4,
                    'timeliness': 0.3,
                    'engagement': 0.3
                }
            },
            'moderation': {
                'reward_weights': {
                    'spam_detection': 0.5,
                    'inappropriate_content': 0.5
                }
            },
            'routing': {
                'reward_weights': {
                    'correct_channel': 0.7,
                    'message_clarity': 0.3
                }
            }
        }
        
    def reset(self) -> Dict[str, np.ndarray]:
        """Reset the environment and return initial observation."""
        self.current_step = 0
        self.recent_messages = []
        
        # Authenticate agent
        self._authenticate()
        
        # Setup workspace and channel
        self._setup_environment()
        
        # Connect to WebSocket
        self._connect_socket()
        
        # Return initial observation
        return self._get_observation()
    
    def step(self, action: Dict[str, Any]) -> Tuple[Dict, float, bool, Dict]:
        """
        Execute action and return observation, reward, done, info.
        
        Args:
            action: Dict containing action_type and parameters
            
        Returns:
            observation: Current state
            reward: Reward for the action
            done: Whether episode is finished
            info: Additional information
        """
        self.current_step += 1
        
        # Execute action
        action_result = self._execute_action(action)
        
        # Calculate reward
        reward = self._calculate_reward(action, action_result)
        
        # Check if episode is done
        done = self.current_step >= self.max_steps
        
        # Get new observation
        observation = self._get_observation()
        
        # Additional info
        info = {
            'action_success': action_result['success'],
            'messages_received': len(self.recent_messages),
            'current_step': self.current_step
        }
        
        return observation, reward, done, info
    
    def render(self, mode='human'):
        """Render the environment."""
        if mode == 'human':
            print(f"\n=== Slack RL Environment (Step {self.current_step}) ===")
            print(f"Workspace: {self.workspace_id}")
            print(f"Current Channel: {self.current_channel_id}")
            print(f"Recent Messages: {len(self.recent_messages)}")
            if self.recent_messages:
                print("\nLast 3 Messages:")
                for msg in self.recent_messages[-3:]:
                    print(f"  [{msg.get('username', 'Unknown')}]: {msg.get('content', '')[:50]}")
        elif mode == 'ansi':
            return f"Step: {self.current_step}, Messages: {len(self.recent_messages)}"
    
    def close(self):
        """Clean up resources."""
        if self.sio_client:
            self.sio_client.disconnect()
    
    # ==================== Private Methods ====================
    
    def _authenticate(self):
        """Authenticate the RL agent."""
        try:
            # Try to login
            response = requests.post(
                f"{self.backend_url}/api/login",
                json={
                    'email': self.agent_email,
                    'password': self.agent_password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get('sessionId')
                self.user_id = data.get('user', {}).get('id')
            else:
                # Create account if doesn't exist
                response = requests.post(
                    f"{self.backend_url}/api/signup",
                    json={
                        'username': 'RL_Agent',
                        'email': self.agent_email,
                        'password': self.agent_password
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.session_id = data.get('sessionId')
                    self.user_id = data.get('user', {}).get('id')
                else:
                    raise Exception("Failed to authenticate RL agent")
        except Exception as e:
            print(f"Authentication error: {e}")
            raise
    
    def _setup_environment(self):
        """Setup workspace and channels."""
        headers = {'Authorization': f'Bearer {self.session_id}'}
        
        # Get or create workspace
        response = requests.get(f"{self.backend_url}/api/workspaces", headers=headers)
        if response.status_code == 200:
            workspaces = response.json()
            if workspaces:
                self.workspace_id = workspaces[0]['id']
            else:
                # Create workspace
                response = requests.post(
                    f"{self.backend_url}/api/workspaces",
                    headers=headers,
                    json={'name': 'RL Training Space', 'slug': 'rl-training'}
                )
                if response.status_code == 200:
                    self.workspace_id = response.json()['workspace']['id']
        
        # Get channels
        response = requests.get(
            f"{self.backend_url}/api/workspaces/{self.workspace_id}/channels",
            headers=headers
        )
        if response.status_code == 200:
            channels = response.json()
            if channels:
                self.current_channel_id = channels[0]['id']
    
    def _connect_socket(self):
        """Connect to WebSocket for real-time updates."""
        try:
            self.sio_client = SocketIOClient()
            
            @self.sio_client.on('new-message')
            def on_message(data):
                self.recent_messages.append(data)
                # Keep only last 50 messages
                if len(self.recent_messages) > 50:
                    self.recent_messages.pop(0)
            
            self.sio_client.connect(self.backend_url)
            
            # Emit user-online event
            self.sio_client.emit('user-online', {
                'userId': self.user_id,
                'workspaceId': self.workspace_id
            })
        except Exception as e:
            print(f"Socket connection error: {e}")
    
    def _get_observation(self) -> Dict[str, np.ndarray]:
        """Get current observation."""
        # Message history embeddings (simplified - in production use real embeddings)
        message_history = np.zeros((10, self.embedding_dim), dtype=np.float32)
        for i, msg in enumerate(self.recent_messages[-10:]):
            # Simple embedding: hash of message content
            content = msg.get('content', '')
            message_history[i] = self._simple_embedding(content)
        
        # Channel info (simplified)
        channel_info = np.random.rand(20).astype(np.float32)
        
        # User presence (simplified)
        user_presence = np.random.rand(50).astype(np.float32)
        
        # Unread counts
        unread_counts = np.zeros(10, dtype=np.int32)
        
        # Conversation context
        if self.recent_messages:
            last_msg = self.recent_messages[-1].get('content', '')
            conversation_context = self._simple_embedding(last_msg)
        else:
            conversation_context = np.zeros(self.embedding_dim, dtype=np.float32)
        
        # Time since last message
        time_since = np.array([0.0], dtype=np.float32)
        
        return {
            'message_history': message_history,
            'channel_info': channel_info,
            'user_presence': user_presence,
            'unread_counts': unread_counts,
            'conversation_context': conversation_context,
            'time_since_last_message': time_since
        }
    
    def _execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the action and return result."""
        action_type = action['action_type']
        headers = {'Authorization': f'Bearer {self.session_id}'}
        
        result = {'success': False, 'message': ''}
        
        try:
            if action_type == 0:  # Send message
                # Decode message from embedding
                message_text = self._decode_message(action['message_embedding'])
                
                # Send via Socket.io
                if self.sio_client:
                    self.sio_client.emit('send-message', {
                        'channel_id': self.current_channel_id,
                        'content': message_text,
                        'user_id': self.user_id
                    })
                    result = {'success': True, 'message': 'Message sent'}
                    
            elif action_type == 1:  # React to message
                if self.recent_messages:
                    last_msg_id = self.recent_messages[-1].get('id')
                    emoji_map = ['👍', '❤️', '😄', '🎉', '👏', '🚀', '✅', '⭐', '🔥', '💯']
                    emoji = emoji_map[action['emoji'] % len(emoji_map)]
                    
                    if self.sio_client:
                        self.sio_client.emit('reaction', {
                            'message_id': last_msg_id,
                            'emoji': emoji,
                            'user_id': self.user_id
                        })
                        result = {'success': True, 'message': 'Reaction added'}
                        
            elif action_type == 5:  # Mark as read
                response = requests.post(
                    f"{self.backend_url}/api/channels/{self.current_channel_id}/mark-read",
                    headers=headers
                )
                result = {'success': response.status_code == 200, 'message': 'Marked as read'}
                
            elif action_type == 6:  # Pin message
                if self.recent_messages:
                    last_msg_id = self.recent_messages[-1].get('id')
                    response = requests.post(
                        f"{self.backend_url}/api/messages/{last_msg_id}/pin",
                        headers=headers,
                        json={'channelId': self.current_channel_id}
                    )
                    result = {'success': response.status_code == 200, 'message': 'Message pinned'}
                    
            elif action_type == 8:  # No action
                result = {'success': True, 'message': 'No action taken'}
                
        except Exception as e:
            result = {'success': False, 'message': str(e)}
        
        return result
    
    def _calculate_reward(self, action: Dict[str, Any], action_result: Dict) -> float:
        """Calculate reward for the action."""
        reward = 0.0
        
        # Base reward for successful action
        if action_result['success']:
            reward += 0.1
        
        # Task-specific rewards
        config = self.task_configs.get(self.task, self.task_configs['conversation'])
        weights = config['reward_weights']
        
        if self.task == 'conversation':
            # Reward for responding to messages
            if action['action_type'] == 0 and self.recent_messages:
                reward += weights['response_relevance'] * 0.5
                
                # Reward for timely response
                if self.current_step < 10:
                    reward += weights['timeliness'] * 0.3
                
                # Reward for engagement
                if len(self.recent_messages) > 0:
                    reward += weights['engagement'] * 0.2
        
        # Penalty for too many actions
        if self.current_step > 0 and action['action_type'] != 8:
            reward -= 0.01
        
        return reward
    
    def _simple_embedding(self, text: str) -> np.ndarray:
        """
        Create simple embedding from text.
        In production, use proper embeddings (BERT, GPT, etc.)
        """
        # Simple hash-based embedding
        embedding = np.zeros(self.embedding_dim, dtype=np.float32)
        if text:
            for i, char in enumerate(text[:self.embedding_dim]):
                embedding[i] = (ord(char) % 256) / 256.0
        return embedding
    
    def _decode_message(self, embedding: np.ndarray) -> str:
        """
        Decode message from embedding.
        In production, use proper decoder (seq2seq, transformer, etc.)
        """
        # For demo, return simple templated messages
        templates = [
            "Hello! How can I help?",
            "That's interesting!",
            "I agree with that.",
            "Can you tell me more?",
            "Thanks for sharing!",
            "Great point!",
            "I'm processing that information.",
            "Let me think about it."
        ]
        
        # Use embedding to select template
        idx = int(np.sum(embedding) * 100) % len(templates)
        return templates[idx]


# ==================== Helper Functions ====================

def make_slack_env(task='conversation', **kwargs):
    """Factory function to create Slack environment."""
    return SlackGymEnv(task=task, **kwargs)


def test_environment():
    """Test the environment."""
    print("Testing Slack RL Environment...")
    
    env = make_slack_env(task='conversation', max_steps=10)
    
    try:
        obs = env.reset()
        print("✓ Environment reset successfully")
        print(f"  Observation keys: {obs.keys()}")
        
        for step in range(5):
            action = env.action_space.sample()
            obs, reward, done, info = env.step(action)
            
            print(f"\nStep {step + 1}:")
            print(f"  Reward: {reward:.3f}")
            print(f"  Done: {done}")
            print(f"  Info: {info}")
            
            env.render()
            
            if done:
                break
        
        print("\n✓ Environment test completed successfully!")
        
    finally:
        env.close()


if __name__ == "__main__":
    test_environment()

