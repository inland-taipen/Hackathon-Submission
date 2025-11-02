"""
Train RL Agent on Slack Environment
====================================

Example training script using Stable-Baselines3 to train an agent
to interact with the Slack clone.
"""

import os
import time
from datetime import datetime
import numpy as np
import torch

# Stable Baselines3
from stable_baselines3 import PPO, A2C, DQN, SAC
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

# Custom environment
from slack_gym_env import SlackGymEnv, make_slack_env


class SlackRLTrainer:
    """
    Trainer for Slack RL agents.
    """
    
    def __init__(
        self,
        algorithm='PPO',
        task='conversation',
        total_timesteps=100000,
        log_dir='./logs',
        model_dir='./models'
    ):
        self.algorithm = algorithm
        self.task = task
        self.total_timesteps = total_timesteps
        self.log_dir = log_dir
        self.model_dir = model_dir
        
        # Create directories
        os.makedirs(log_dir, exist_ok=True)
        os.makedirs(model_dir, exist_ok=True)
        
        # Timestamp for this training run
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.run_name = f"{algorithm}_{task}_{self.timestamp}"
        
    def create_env(self):
        """Create and wrap environment."""
        # Create base environment
        env = make_slack_env(
            task=self.task,
            max_steps=100,
            backend_url="http://localhost:3001"
        )
        
        # Wrap with Monitor for logging
        env = Monitor(env, os.path.join(self.log_dir, self.run_name))
        
        # Vectorize environment
        env = DummyVecEnv([lambda: env])
        
        # Normalize observations
        env = VecNormalize(env, norm_obs=True, norm_reward=True)
        
        return env
    
    def create_model(self, env):
        """Create RL model based on algorithm."""
        if self.algorithm == 'PPO':
            model = PPO(
                'MultiInputPolicy',
                env,
                learning_rate=3e-4,
                n_steps=2048,
                batch_size=64,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.95,
                clip_range=0.2,
                verbose=1,
                tensorboard_log=self.log_dir
            )
        elif self.algorithm == 'A2C':
            model = A2C(
                'MultiInputPolicy',
                env,
                learning_rate=7e-4,
                n_steps=5,
                gamma=0.99,
                gae_lambda=1.0,
                verbose=1,
                tensorboard_log=self.log_dir
            )
        elif self.algorithm == 'SAC':
            model = SAC(
                'MultiInputPolicy',
                env,
                learning_rate=3e-4,
                buffer_size=100000,
                batch_size=256,
                gamma=0.99,
                verbose=1,
                tensorboard_log=self.log_dir
            )
        else:
            raise ValueError(f"Unknown algorithm: {self.algorithm}")
        
        return model
    
    def train(self):
        """Train the agent."""
        print(f"\n{'='*60}")
        print(f"Training {self.algorithm} on {self.task} task")
        print(f"Total timesteps: {self.total_timesteps}")
        print(f"Run name: {self.run_name}")
        print(f"{'='*60}\n")
        
        # Create environment
        env = self.create_env()
        
        # Create model
        model = self.create_model(env)
        
        # Callbacks
        checkpoint_callback = CheckpointCallback(
            save_freq=10000,
            save_path=os.path.join(self.model_dir, self.run_name),
            name_prefix='rl_model'
        )
        
        eval_callback = EvalCallback(
            env,
            best_model_save_path=os.path.join(self.model_dir, self.run_name, 'best'),
            log_path=os.path.join(self.log_dir, self.run_name),
            eval_freq=5000,
            deterministic=True,
            render=False
        )
        
        # Train
        try:
            model.learn(
                total_timesteps=self.total_timesteps,
                callback=[checkpoint_callback, eval_callback],
                tb_log_name=self.run_name
            )
            
            # Save final model
            final_model_path = os.path.join(self.model_dir, f"{self.run_name}_final")
            model.save(final_model_path)
            env.save(os.path.join(self.model_dir, f"{self.run_name}_vecnormalize.pkl"))
            
            print(f"\n✓ Training completed!")
            print(f"  Model saved to: {final_model_path}")
            
            return model, env
            
        except KeyboardInterrupt:
            print("\n⚠ Training interrupted by user")
            model.save(os.path.join(self.model_dir, f"{self.run_name}_interrupted"))
            return model, env
    
    def evaluate(self, model, env, n_episodes=10):
        """Evaluate trained model."""
        print(f"\n{'='*60}")
        print(f"Evaluating {self.algorithm} for {n_episodes} episodes")
        print(f"{'='*60}\n")
        
        episode_rewards = []
        episode_lengths = []
        
        for episode in range(n_episodes):
            obs = env.reset()
            done = False
            episode_reward = 0
            episode_length = 0
            
            while not done:
                action, _states = model.predict(obs, deterministic=True)
                obs, reward, done, info = env.step(action)
                episode_reward += reward[0]
                episode_length += 1
            
            episode_rewards.append(episode_reward)
            episode_lengths.append(episode_length)
            
            print(f"Episode {episode + 1}: Reward = {episode_reward:.3f}, Length = {episode_length}")
        
        print(f"\n{'='*60}")
        print(f"Evaluation Results:")
        print(f"  Mean Reward: {np.mean(episode_rewards):.3f} ± {np.std(episode_rewards):.3f}")
        print(f"  Mean Length: {np.mean(episode_lengths):.1f} ± {np.std(episode_lengths):.1f}")
        print(f"{'='*60}\n")
        
        return episode_rewards, episode_lengths


def train_conversation_agent():
    """Train agent for conversation task."""
    trainer = SlackRLTrainer(
        algorithm='PPO',
        task='conversation',
        total_timesteps=50000
    )
    
    model, env = trainer.train()
    trainer.evaluate(model, env, n_episodes=5)
    
    return model, env


def train_moderation_agent():
    """Train agent for moderation task."""
    trainer = SlackRLTrainer(
        algorithm='PPO',
        task='moderation',
        total_timesteps=30000
    )
    
    model, env = trainer.train()
    trainer.evaluate(model, env, n_episodes=5)
    
    return model, env


def train_routing_agent():
    """Train agent for message routing task."""
    trainer = SlackRLTrainer(
        algorithm='A2C',
        task='routing',
        total_timesteps=40000
    )
    
    model, env = trainer.train()
    trainer.evaluate(model, env, n_episodes=5)
    
    return model, env


def compare_algorithms():
    """Compare different RL algorithms."""
    algorithms = ['PPO', 'A2C']
    results = {}
    
    for algo in algorithms:
        print(f"\n{'#'*60}")
        print(f"# Training {algo}")
        print(f"{'#'*60}\n")
        
        trainer = SlackRLTrainer(
            algorithm=algo,
            task='conversation',
            total_timesteps=20000
        )
        
        model, env = trainer.train()
        rewards, lengths = trainer.evaluate(model, env, n_episodes=10)
        
        results[algo] = {
            'mean_reward': np.mean(rewards),
            'std_reward': np.std(rewards),
            'mean_length': np.mean(lengths),
            'std_length': np.std(lengths)
        }
    
    # Print comparison
    print(f"\n{'='*60}")
    print("Algorithm Comparison:")
    print(f"{'='*60}")
    for algo, metrics in results.items():
        print(f"\n{algo}:")
        print(f"  Reward: {metrics['mean_reward']:.3f} ± {metrics['std_reward']:.3f}")
        print(f"  Length: {metrics['mean_length']:.1f} ± {metrics['std_length']:.1f}")
    print(f"\n{'='*60}\n")
    
    return results


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train RL agent on Slack environment')
    parser.add_argument('--algorithm', type=str, default='PPO', choices=['PPO', 'A2C', 'SAC'],
                        help='RL algorithm to use')
    parser.add_argument('--task', type=str, default='conversation', 
                        choices=['conversation', 'moderation', 'routing'],
                        help='Task to train on')
    parser.add_argument('--timesteps', type=int, default=50000,
                        help='Total training timesteps')
    parser.add_argument('--compare', action='store_true',
                        help='Compare different algorithms')
    
    args = parser.parse_args()
    
    if args.compare:
        compare_algorithms()
    else:
        trainer = SlackRLTrainer(
            algorithm=args.algorithm,
            task=args.task,
            total_timesteps=args.timesteps
        )
        
        model, env = trainer.train()
        trainer.evaluate(model, env, n_episodes=10)
        
        print("\n✓ Training complete! Check logs/ and models/ directories")
        print(f"  TensorBoard: tensorboard --logdir {trainer.log_dir}")

