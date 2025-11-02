"""
Simple Training Example
========================

Basic example of training an RL agent on the Slack environment.
"""

from rl_env import make_slack_env
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env

def main():
    print("="*60)
    print("Slack RL Environment - Simple Training Example")
    print("="*60)
    
    # Step 1: Create environment
    print("\n1. Creating environment...")
    env = make_slack_env(
        task='conversation',
        max_steps=50,
        backend_url="http://localhost:3001"
    )
    
    # Step 2: Validate environment
    print("2. Checking environment validity...")
    check_env(env)
    print("✓ Environment is valid!")
    
    # Step 3: Create agent
    print("\n3. Creating PPO agent...")
    model = PPO(
        'MultiInputPolicy',
        env,
        learning_rate=3e-4,
        verbose=1
    )
    
    # Step 4: Train
    print("\n4. Training for 10,000 timesteps...")
    model.learn(total_timesteps=10000)
    
    # Step 5: Save model
    print("\n5. Saving model...")
    model.save("ppo_slack_simple")
    print("✓ Model saved as 'ppo_slack_simple.zip'")
    
    # Step 6: Test trained model
    print("\n6. Testing trained model...")
    obs = env.reset()
    
    for i in range(10):
        action, _states = model.predict(obs, deterministic=True)
        obs, reward, done, info = env.step(action)
        print(f"  Step {i+1}: Reward = {reward:.3f}")
        if done:
            break
    
    env.close()
    
    print("\n" + "="*60)
    print("Training completed successfully!")
    print("="*60)

if __name__ == "__main__":
    main()

