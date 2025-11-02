"""
Simple Slack RL Environment (No Dependencies)
==============================================

A minimal RL environment for the Slack clone that doesn't require
NumPy, Gymnasium, or any ML libraries.

Works with pure Python only!
"""

import requests
import json
import random
from typing import Dict, List, Tuple, Any, Optional

class SimpleSlackEnv:
    """
    A simple RL environment for interacting with the Slack clone.
    No external dependencies required (except requests for API calls).
    """
    
    def __init__(self, backend_url="http://localhost:3001", task="conversation"):
        self.backend_url = backend_url
        self.task = task
        self.current_step = 0
        self.max_steps = 50
        self.workspace_id = None
        self.channel_id = None
        self.user_token = None
        
        # Action space: simple integer actions
        self.action_space_size = 5
        self.actions = {
            0: "send_message",
            1: "react_to_message",
            2: "create_channel",
            3: "read_messages",
            4: "idle"
        }
        
        # Observation space: simplified state representation
        self.observation_dim = 10
        
        print("✅ Simple Slack RL Environment initialized")
        print(f"   Backend URL: {backend_url}")
        print(f"   Task: {task}")
        print(f"   Actions: {list(self.actions.values())}")
    
    def reset(self) -> Tuple[List[float], Dict]:
        """Reset the environment to initial state."""
        self.current_step = 0
        
        # Try to authenticate and get workspace
        try:
            # For demo purposes, we'll use a simple observation
            observation = self._get_observation()
            info = {
                'step': 0,
                'workspace': self.workspace_id,
                'channel': self.channel_id
            }
            
            print("✅ Environment reset")
            return observation, info
            
        except Exception as e:
            print(f"⚠️  Error during reset: {e}")
            # Return a default observation
            return [0.0] * self.observation_dim, {'error': str(e)}
    
    def step(self, action: int) -> Tuple[List[float], float, bool, bool, Dict]:
        """
        Take an action in the environment.
        
        Returns:
            observation: Current state
            reward: Reward for this step
            terminated: Episode ended successfully
            truncated: Episode ended due to limit
            info: Additional information
        """
        self.current_step += 1
        
        # Execute the action
        action_name = self.actions.get(action, "idle")
        reward = self._execute_action(action)
        
        # Get new observation
        observation = self._get_observation()
        
        # Check if episode is done
        terminated = False
        truncated = self.current_step >= self.max_steps
        
        info = {
            'step': self.current_step,
            'action': action_name,
            'reward': reward
        }
        
        return observation, reward, terminated, truncated, info
    
    def _execute_action(self, action: int) -> float:
        """Execute an action and return the reward."""
        action_name = self.actions.get(action, "idle")
        
        # Simulated rewards for different actions
        if action_name == "send_message":
            # Reward for sending a message
            return 1.0
        elif action_name == "react_to_message":
            # Small reward for reacting
            return 0.5
        elif action_name == "create_channel":
            # Reward for creating a channel
            return 2.0
        elif action_name == "read_messages":
            # Small reward for reading
            return 0.3
        else:  # idle
            # No reward for doing nothing
            return -0.1
    
    def _get_observation(self) -> List[float]:
        """
        Get the current observation (state representation).
        
        For simplicity, we return a list of floats representing:
        - Current step (normalized)
        - Random state features (in a real implementation, these would be
          derived from the actual Slack state)
        """
        obs = [
            self.current_step / self.max_steps,  # Normalized step count
            random.random(),  # Placeholder features
            random.random(),
            random.random(),
            random.random(),
            random.random(),
            random.random(),
            random.random(),
            random.random(),
            random.random()
        ]
        return obs
    
    def close(self):
        """Clean up resources."""
        print("✅ Environment closed")
    
    def sample_action(self) -> int:
        """Sample a random action from the action space."""
        return random.randint(0, self.action_space_size - 1)


def make_simple_slack_env(backend_url="http://localhost:3001", task="conversation"):
    """Factory function to create a SimpleSlackEnv instance."""
    return SimpleSlackEnv(backend_url=backend_url, task=task)


if __name__ == "__main__":
    # Quick test
    print("Testing SimpleSlackEnv...")
    env = SimpleSlackEnv()
    obs, info = env.reset()
    print(f"Initial observation: {obs[:3]}... (length: {len(obs)})")
    
    for i in range(5):
        action = env.sample_action()
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"Step {i+1}: Action={info['action']}, Reward={reward:.2f}")
        
        if terminated or truncated:
            break
    
    env.close()
    print("✅ Test complete!")

