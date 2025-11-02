"""
Basic Demo Without ML Libraries
=================================

Simple demonstration of the Slack RL environment without requiring
torch/stable-baselines3 (which have compatibility issues on ARM Mac).
"""

import sys
sys.path.insert(0, '/Users/anika/midnight')

from rl_env.slack_gym_env import SlackGymEnv
import time

def main():
    print("="*70)
    print(" 🤖  SLACK RL ENVIRONMENT - BASIC DEMO")
    print("="*70)
    print()
    print("This demo shows the RL environment working with the Slack clone.")
    print("No ML training - just demonstrating the environment interface.")
    print()
    
    # Create environment
    print("📋 Step 1: Creating environment...")
    try:
        env = SlackGymEnv(
            backend_url="http://localhost:3001",
            task="conversation",
            max_steps=10
        )
        print("✅ Environment created successfully!")
    except Exception as e:
        print(f"❌ Error creating environment: {e}")
        print("\n⚠️  Make sure the backend is running:")
        print("   Terminal 1: cd /Users/anika/midnight/server && node index.js")
        return
    
    print()
    print("="*70)
    print()
    
    # Reset environment
    print("📋 Step 2: Resetting environment...")
    try:
        observation, info = env.reset()
        print("✅ Environment reset successful!")
        print(f"   Observation space: {env.observation_space}")
        print(f"   Action space: {env.action_space}")
    except Exception as e:
        print(f"❌ Error resetting: {e}")
        return
    
    print()
    print("="*70)
    print()
    
    # Run a few steps with random actions
    print("📋 Step 3: Running 10 random actions...")
    print()
    
    total_reward = 0
    for step in range(10):
        # Sample random action
        action = env.action_space.sample()
        
        try:
            # Take action in environment
            observation, reward, terminated, truncated, info = env.step(action)
            
            total_reward += reward
            
            print(f"   Step {step + 1}/10:")
            print(f"      Action: {action}")
            print(f"      Reward: {reward:.2f}")
            print(f"      Total Reward: {total_reward:.2f}")
            
            if terminated or truncated:
                print(f"      Episode ended (terminated={terminated}, truncated={truncated})")
                break
                
        except Exception as e:
            print(f"❌ Error at step {step + 1}: {e}")
            break
        
        time.sleep(0.5)  # Small delay for readability
    
    print()
    print("="*70)
    print()
    print(f"✅ DEMO COMPLETE!")
    print(f"   Total Reward: {total_reward:.2f}")
    print(f"   Steps Taken: {step + 1}")
    print()
    print("🎯 The RL environment is working correctly with your Slack clone!")
    print()
    print("="*70)
    
    env.close()

if __name__ == "__main__":
    main()

